<?php

namespace App\Services;

use App\Models\CameraSource;
use App\Models\RawDataCollectionSetting;
use FFMpeg\Coordinate\TimeCode;
use FFMpeg\FFMpeg;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class RawDataCollectionFrameCaptureService
{
  public function captureScheduled(): int
  {
    $capturedCount = 0;

    RawDataCollectionSetting::query()
      ->with('cameraSource')
      ->where('collection_type', 'scheduled_capture')
      ->chunkById(100, function (Collection $settings) use (&$capturedCount): void {
        foreach ($settings as $setting) {
          if (!($setting instanceof RawDataCollectionSetting)) {
            continue;
          }

          if ($this->captureFrame($setting)) {
            $capturedCount++;
          }
        }
      });

    return $capturedCount;
  }

  public function captureById(int $rawDataCollectionSettingId): bool
  {
    $setting = RawDataCollectionSetting::query()
      ->with('cameraSource')
      ->findOrFail($rawDataCollectionSettingId);

    return $this->captureFrame($setting, true);
  }

  private function captureFrame(RawDataCollectionSetting $setting, bool $forceCapture = false): bool
  {
    $cameraSource = $setting->cameraSource;
    if (!($cameraSource instanceof CameraSource)) {
      return false;
    }

    if (!$cameraSource->is_active) {
      return false;
    }

    $liveFeedUrl = $cameraSource->live_feed_url;
    if (!is_string($liveFeedUrl) || trim($liveFeedUrl) === '') {
      return false;
    }

    $storageDestination = $setting->storage_destination;
    if (!is_string($storageDestination) || trim($storageDestination) === '') {
      return false;
    }

    $normalizedStorageDestination = $this->normalizeStorageDestination($storageDestination);
    if ($normalizedStorageDestination === null) {
      return false;
    }

    $framesDirectory = $normalizedStorageDestination . '/frames';
    Storage::disk('local')->makeDirectory($framesDirectory);

    $existingFramePaths = $this->listFramePaths($framesDirectory);

    if (!$forceCapture && !$this->isDueForCapture($setting, $existingFramePaths, $cameraSource)) {
      return false;
    }

    if (!$this->canCaptureNewFrame($setting, $existingFramePaths)) {
      return false;
    }

    $outputExtension = $this->resolveOutputExtension($cameraSource);
    $newFrameRelativePath = $framesDirectory . '/frame_' . now()->format('Ymd_His_u') . '_' . Str::uuid() . '.' . $outputExtension;
    $newFrameAbsolutePath = Storage::disk('local')->path($newFrameRelativePath);

    $ffmpeg = FFMpeg::create($this->buildFfmpegConfiguration($cameraSource));

    try {
      $ffmpeg->open($liveFeedUrl)->frame(TimeCode::fromSeconds(0))->save($newFrameAbsolutePath);
    } catch (Throwable $throwable) {
      Log::warning('Failed to capture camera frame.', [
        'raw_data_collection_setting_id' => $setting->id,
        'camera_source_id' => $cameraSource->id,
        'error' => $throwable->getMessage(),
      ]);

      return false;
    }

    if (!$this->isValidImageFrame($newFrameRelativePath)) {
      Storage::disk('local')->delete($newFrameRelativePath);

      return false;
    }

    $this->enforceRetentionLimits($setting, $this->listFramePaths($framesDirectory));

    return true;
  }

  /**
   * @param array<int, string> $framePaths
   */
  private function isDueForCapture(
    RawDataCollectionSetting $setting,
    array                    $framePaths,
    CameraSource             $cameraSource
  ): bool
  {
    if ($framePaths === []) {
      return true;
    }

    $lastFramePath = $this->latestFramePath($framePaths);
    if ($lastFramePath === null) {
      return true;
    }

    $lastModified = Storage::disk('local')->lastModified($lastFramePath);
    $elapsedSeconds = time() - $lastModified;

    return $elapsedSeconds >= $this->samplingIntervalToSeconds($setting, $cameraSource);
  }

  /**
   * @param array<int, string> $framePaths
   */
  private function canCaptureNewFrame(RawDataCollectionSetting $setting, array $framePaths): bool
  {
    if ($setting->lifecycle_strategy !== 'stop_on_condition') {
      return true;
    }

    $currentImageCount = count($framePaths);
    if ($currentImageCount >= $setting->max_image_count) {
      return false;
    }

    $currentBytes = $this->calculateTotalBytes($framePaths);
    $maxBytes = $this->maxStorageBytes($setting);

    return $currentBytes < $maxBytes;
  }

  /**
   * @param array<int, string> $framePaths
   */
  private function enforceRetentionLimits(RawDataCollectionSetting $setting, array $framePaths): void
  {
    if ($setting->lifecycle_strategy !== 'replace_oldest_on_condition') {
      return;
    }

    $maxBytes = $this->maxStorageBytes($setting);

    while (
      count($framePaths) > $setting->max_image_count
      || $this->calculateTotalBytes($framePaths) > $maxBytes
    ) {
      $oldestFramePath = $this->oldestFramePath($framePaths);
      if ($oldestFramePath === null) {
        return;
      }

      Storage::disk('local')->delete($oldestFramePath);
      $framePaths = array_values(array_filter(
        $framePaths,
        static fn(string $path): bool => $path !== $oldestFramePath
      ));
    }
  }

  /**
   * @return array<string, mixed>
   */
  private function buildFfmpegConfiguration(CameraSource $cameraSource): array
  {
    $cameraSpecification = $cameraSource->camera_specification;
    if (!is_array($cameraSpecification)) {
      return [];
    }

    $configuration = [];

    $ffmpegBinaries = $cameraSpecification['ffmpeg_binaries'] ?? null;
    if (is_string($ffmpegBinaries) && trim($ffmpegBinaries) !== '') {
      $configuration['ffmpeg.binaries'] = $ffmpegBinaries;
    }

    $ffprobeBinaries = $cameraSpecification['ffprobe_binaries'] ?? null;
    if (is_string($ffprobeBinaries) && trim($ffprobeBinaries) !== '') {
      $configuration['ffprobe.binaries'] = $ffprobeBinaries;
    }

    $timeout = $cameraSpecification['ffmpeg_timeout_seconds'] ?? null;
    if (is_int($timeout) && $timeout > 0) {
      $configuration['timeout'] = $timeout;
    }

    $threads = $cameraSpecification['ffmpeg_threads'] ?? null;
    if (is_int($threads) && $threads > 0) {
      $configuration['ffmpeg.threads'] = $threads;
    }

    return $configuration;
  }

  private function samplingIntervalToSeconds(
    RawDataCollectionSetting $setting,
    CameraSource             $cameraSource
  ): int
  {
    $intervalValue = max(1, (int)$setting->frame_sampling_interval_value);

    if ($setting->frame_sampling_interval_unit === 'seconds') {
      return $intervalValue;
    }

    $fps = null;
    $cameraSpecification = $cameraSource->camera_specification;
    if (is_array($cameraSpecification) && isset($cameraSpecification['fps'])) {
      $parsedFps = is_numeric($cameraSpecification['fps'])
        ? (float)$cameraSpecification['fps']
        : null;

      if ($parsedFps !== null && $parsedFps > 0) {
        $fps = $parsedFps;
      }
    }

    if ($fps === null) {
      return 1;
    }

    return max(1, (int)ceil($intervalValue / $fps));
  }

  /**
   * @param array<int, string> $framePaths
   */
  private function calculateTotalBytes(array $framePaths): int
  {
    return array_reduce($framePaths, function (int $carry, string $path): int {
      if (!Storage::disk('local')->exists($path)) {
        return $carry;
      }

      return $carry + Storage::disk('local')->size($path);
    }, 0);
  }

  private function maxStorageBytes(RawDataCollectionSetting $setting): int
  {
    $maxStorageMb = max(1, (int)$setting->max_storage_size_mb);

    return $maxStorageMb * 1024 * 1024;
  }

  private function isValidImageFrame(string $path): bool
  {
    if (!Storage::disk('local')->exists($path)) {
      return false;
    }

    $absolutePath = Storage::disk('local')->path($path);
    $mimeType = mime_content_type($absolutePath);

    return is_string($mimeType) && str_starts_with($mimeType, 'image/');
  }

  private function normalizeStorageDestination(string $storageDestination): ?string
  {
    $normalizedStorageDestination = trim(str_replace('\\', '/', $storageDestination), '/');

    if ($normalizedStorageDestination === '') {
      return null;
    }

    if (str_contains($normalizedStorageDestination, '..')) {
      return null;
    }

    if (preg_match('/^[-A-Za-z0-9._\/]+$/', $normalizedStorageDestination) !== 1) {
      return null;
    }

    return $normalizedStorageDestination;
  }

  private function resolveOutputExtension(CameraSource $cameraSource): string
  {
    $cameraSpecification = $cameraSource->camera_specification;
    if (!is_array($cameraSpecification)) {
      return 'jpg';
    }

    $outputExtension = $cameraSpecification['frame_output_extension'] ?? null;
    if (!is_string($outputExtension)) {
      return 'jpg';
    }

    $normalizedExtension = strtolower(trim($outputExtension, ". \t\n\r\0\x0B"));
    if (!in_array($normalizedExtension, ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tif', 'tiff'], true)) {
      return 'jpg';
    }

    return $normalizedExtension;
  }

  /**
   * @return array<int, string>
   */
  private function listFramePaths(string $framesDirectory): array
  {
    return collect(Storage::disk('local')->allFiles($framesDirectory))
      ->filter(static function (string $path): bool {
        $filename = pathinfo($path, PATHINFO_FILENAME);
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return str_starts_with($filename, 'frame_')
          && in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tif', 'tiff'], true);
      })
      ->values()
      ->all();
  }

  /**
   * @param array<int, string> $framePaths
   */
  private function latestFramePath(array $framePaths): ?string
  {
    return collect($framePaths)
      ->sortByDesc(static fn(string $path): int => Storage::disk('local')->lastModified($path))
      ->first();
  }

  /**
   * @param array<int, string> $framePaths
   */
  private function oldestFramePath(array $framePaths): ?string
  {
    return collect($framePaths)
      ->sortBy(static fn(string $path): int => Storage::disk('local')->lastModified($path))
      ->first();
  }
}
