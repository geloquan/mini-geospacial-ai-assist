<?php

namespace App\Services;

use App\Models\CameraSource;
use App\Models\CameraSourceHealthLog;
use App\Models\RawDataCollectionSetting;
use Carbon\CarbonImmutable;
use FFMpeg\Coordinate\TimeCode;
use FFMpeg\FFMpeg;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class RawDataCollectionFrameCaptureService
{
  private const STATUS_SEPARATOR = '|';
  private const CAPTURE_WINDOW_SLEEP_SECONDS = 1;
  private const FFMPEG_MAINTENANCE_INTERVAL_SECONDS = 10;

  public function captureScheduled(): int
  {
    $capturedCount = 0;

    RawDataCollectionSetting::query()
      ->with('cameraSource.location')
      ->where('collection_type', 'scheduled_capture')
      ->where('is_active', true)
      ->whereHas('cameraSource', static function ($query): void {
        $query->where('is_active', true);
      })
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

  public function captureScheduledWindow(int $windowSeconds = 600): int
  {
    $normalizedWindowSeconds = max(1, $windowSeconds);
    $capturedCount = 0;
    $windowEndsAt = microtime(true) + $normalizedWindowSeconds;
    $nextCaptureAtBySetting = [];

    while (microtime(true) < $windowEndsAt) {
      $capturedCount += $this->captureScheduledWithHints($nextCaptureAtBySetting);

      $remainingSeconds = (int) ceil($windowEndsAt - microtime(true));

      if ($remainingSeconds > 0) {
        sleep(min(self::CAPTURE_WINDOW_SLEEP_SECONDS, $remainingSeconds));
      }
    }

    return $capturedCount;
  }

  /**
   * @param array<int, int> $nextCaptureAtBySetting
   */
  private function captureScheduledWithHints(array &$nextCaptureAtBySetting): int
  {
    $capturedCount = 0;
    $activeSettingIds = [];

    RawDataCollectionSetting::query()
      ->with('cameraSource.location')
      ->where('collection_type', 'scheduled_capture')
      ->where('is_active', true)
      ->whereHas('cameraSource', static function ($query): void {
        $query->where('is_active', true);
      })
      ->chunkById(100, function (Collection $settings) use (&$capturedCount, &$nextCaptureAtBySetting, &$activeSettingIds): void {
        foreach ($settings as $setting) {
          if (!($setting instanceof RawDataCollectionSetting)) {
            continue;
          }

          $settingId = (int) $setting->id;
          $activeSettingIds[] = $settingId;
          $nextCaptureAt = $nextCaptureAtBySetting[$settingId] ?? null;
          if (is_int($nextCaptureAt) && $nextCaptureAt > time()) {
            continue;
          }

          if (!$this->captureFrame($setting)) {
            continue;
          }

          $capturedCount++;
          $cameraSource = $setting->cameraSource;
          if ($cameraSource instanceof CameraSource) {
            $nextCaptureAtBySetting[$settingId] = time() + $this->samplingIntervalToSeconds($setting, $cameraSource);
          }
        }
      });

    if ($activeSettingIds === []) {
      $nextCaptureAtBySetting = [];
      return $capturedCount;
    }

    $nextCaptureAtBySetting = array_intersect_key(
      $nextCaptureAtBySetting,
      array_flip($activeSettingIds)
    );

    return $capturedCount;
  }

  public function captureScheduledWindowFfmpeg(int $windowSeconds = 600): int
  {
    $normalizedWindowSeconds = max(1, $windowSeconds);
    $windowEndsAt = microtime(true) + $normalizedWindowSeconds;

    /** @var array<int, array{process: resource, setting: RawDataCollectionSetting, frames_dir: string, camera_source: CameraSource, initial_frame_count: int}> $processMap */
    $processMap = [];

    RawDataCollectionSetting::query()
      ->with('cameraSource.location')
      ->where('collection_type', 'scheduled_capture')
      ->where('is_active', true)
      ->whereHas('cameraSource', static function ($query): void {
        $query->where('is_active', true);
      })
      ->chunkById(100, function (Collection $settings) use (&$processMap): void {
        foreach ($settings as $setting) {
          if (!($setting instanceof RawDataCollectionSetting)) {
            continue;
          }

          $process = $this->launchFfmpegProcess($setting);
          if ($process === null) {
            continue;
          }

          $cameraSource = $setting->cameraSource;
          $framesDir = $this->resolveFramesDirectory($setting);
          if (!($cameraSource instanceof CameraSource) || $framesDir === null) {
            proc_terminate($process);
            proc_close($process);
            continue;
          }

          $processMap[(int) $setting->id] = [
            'process' => $process,
            'setting' => $setting,
            'frames_dir' => $framesDir,
            'camera_source' => $cameraSource,
            'initial_frame_count' => count($this->listFrameMetadata($framesDir)),
          ];
        }
      });

    while (microtime(true) < $windowEndsAt) {
      $remainingSeconds = $windowEndsAt - microtime(true);
      sleep((int) min(self::FFMPEG_MAINTENANCE_INTERVAL_SECONDS, max(1, ceil($remainingSeconds))));

      foreach ($processMap as $settingId => $info) {
        $status = proc_get_status($info['process']);
        if (!$status['running']) {
          $this->logCameraSourceHealth(
            $info['camera_source'],
            'connection_error',
            'FFmpeg frame capture process exited unexpectedly.'
          );
          proc_close($info['process']);
          unset($processMap[$settingId]);
          continue;
        }

        $frames = $this->listFrameMetadata($info['frames_dir']);
        $this->enforceRetentionLimits($info['setting'], $frames);

        if (!$this->canCaptureNewFrame($info['setting'], $frames)) {
          proc_terminate($info['process']);
          proc_close($info['process']);
          unset($processMap[$settingId]);
          $this->logCameraSourceHealth(
            $info['camera_source'],
            'collecting',
            'Collection lifecycle condition reached; FFmpeg capture stopped.'
          );
        }
      }
    }

    $capturedCount = 0;
    foreach ($processMap as $info) {
      $finalCount = count($this->listFrameMetadata($info['frames_dir']));
      $capturedCount += max(0, $finalCount - $info['initial_frame_count']);
      $status = proc_get_status($info['process']);
      if ($status['running']) {
        proc_terminate($info['process']);
      }
      proc_close($info['process']);
    }

    return $capturedCount;
  }

  public function captureById(int $rawDataCollectionSettingId): bool
  {
    $setting = RawDataCollectionSetting::query()
      ->with('cameraSource.location')
      ->findOrFail($rawDataCollectionSettingId);

    return $this->captureFrame($setting, true);
  }

  private function captureFrame(RawDataCollectionSetting $setting, bool $forceCapture = false): bool
  {
    $cameraSource = $setting->cameraSource;
    if (!($cameraSource instanceof CameraSource)) {
      return false;
    }

    if (!$setting->is_active) {
      $this->logCameraSourceHealth(
        $cameraSource,
        'inactive',
        'Raw data collection setting is inactive and cannot collect frames.'
      );
      return false;
    }

    if (!$cameraSource->is_active) {
      $this->logCameraSourceHealth(
        $cameraSource,
        'inactive',
        'Camera source is inactive and cannot collect frames.'
      );
      return false;
    }

    $liveFeedUrl = $cameraSource->live_feed_url;
    if (!is_string($liveFeedUrl) || trim($liveFeedUrl) === '') {
      $this->logCameraSourceHealth(
        $cameraSource,
        'configuration_error',
        'Live feed URL is missing for the camera source.'
      );
      return false;
    }

    $storageDestination = $setting->storage_destination;
    if (!is_string($storageDestination) || trim($storageDestination) === '') {
      $this->logCameraSourceHealth(
        $cameraSource,
        'configuration_error',
        'Storage destination is missing for raw data collection.'
      );
      return false;
    }

    $normalizedStorageDestination = $this->normalizeStorageDestination($storageDestination);
    if ($normalizedStorageDestination === null) {
      $this->logCameraSourceHealth(
        $cameraSource,
        'configuration_error',
        'Storage destination is invalid for raw data collection.'
      );
      return false;
    }

    $framesDirectory = $normalizedStorageDestination . '/frames';
    Storage::disk('local')->makeDirectory($framesDirectory);

    $existingFrames = $this->listFrameMetadata($framesDirectory);

    if (!$forceCapture && !$this->isDueForCapture($setting, $existingFrames, $cameraSource)) {
      return false;
    }

    if (!$this->canCaptureNewFrame($setting, $existingFrames)) {
      $this->logCameraSourceHealth(
        $cameraSource,
        'configuration_error',
        'Collection lifecycle condition prevents capturing new frames.'
      );
      return false;
    }

    $outputExtension = $this->resolveOutputExtension($cameraSource);
    $locationTimezone = $this->resolveLocationTimezone($cameraSource);
    $newFrameRelativePath = $framesDirectory . '/frame_' . CarbonImmutable::now($locationTimezone)->format('Ymd_His_u') . '_' . Str::uuid() . '.' . $outputExtension;
    $newFrameAbsolutePath = Storage::disk('local')->path($newFrameRelativePath);

    $ffmpeg = FFMpeg::create($this->buildFfmpegConfiguration($cameraSource));
    $captureStartedAt = microtime(true);

    try {
      $ffmpeg->open($liveFeedUrl)->frame(TimeCode::fromSeconds(0))->save($newFrameAbsolutePath);
    } catch (Throwable $throwable) {
      $delay = $this->elapsedCaptureDelay($captureStartedAt);
      $this->logCameraSourceHealth(
        $cameraSource,
        'connection_error',
        'Unable to capture frame from live feed URL. Verify connectivity and stream format.',
        $delay
      );
      Log::warning('Failed to capture camera frame.', [
        'raw_data_collection_setting_id' => $setting->id,
        'camera_source_id' => $cameraSource->id,
        'error' => $throwable->getMessage(),
      ]);

      return false;
    }

    if (!$this->isValidImageFrame($newFrameRelativePath)) {
      $delay = $this->elapsedCaptureDelay($captureStartedAt);
      $this->logCameraSourceHealth(
        $cameraSource,
        'connection_error',
        'Live feed output is not a valid image frame.',
        $delay
      );
      Storage::disk('local')->delete($newFrameRelativePath);

      return false;
    }

    $existingFrames[] = $this->buildCapturedFrameMetadata($newFrameRelativePath, $newFrameAbsolutePath);
    $this->enforceRetentionLimits($setting, $existingFrames);
    $delay = $this->elapsedCaptureDelay($captureStartedAt);
    $this->logCameraSourceHealth(
      $cameraSource,
      'collecting',
      'Actively collecting data from camera source.',
      $delay
    );

    return true;
  }

  /**
   * @param array<int, array{path: string, last_modified: int, size: int}> $frames
   */
  private function isDueForCapture(
    RawDataCollectionSetting $setting,
    array                    $frames,
    CameraSource             $cameraSource
  ): bool
  {
    if ($frames === []) {
      return true;
    }

    $latestFrameLastModified = $this->latestFrameLastModified($frames);
    if ($latestFrameLastModified === null) {
      return true;
    }

    $elapsedSeconds = time() - $latestFrameLastModified;

    return $elapsedSeconds >= $this->samplingIntervalToSeconds($setting, $cameraSource);
  }

  /**
   * @param array<int, array{path: string, last_modified: int, size: int}> $frames
   */
  private function canCaptureNewFrame(RawDataCollectionSetting $setting, array $frames): bool
  {
    if ($setting->lifecycle_strategy !== 'stop_on_condition') {
      return true;
    }

    $currentImageCount = count($frames);
    if ($currentImageCount >= $setting->max_image_count) {
      return false;
    }

    $currentBytes = $this->totalBytesFromMetadata($frames);
    $maxBytes = $this->maxStorageBytes($setting);

    return $currentBytes < $maxBytes;
  }

  /**
   * @param array<int, array{path: string, last_modified: int, size: int}> $frames
   */
  private function enforceRetentionLimits(RawDataCollectionSetting $setting, array $frames): void
  {
    if ($setting->lifecycle_strategy !== 'replace_oldest_on_condition') {
      return;
    }

    $maxBytes = $this->maxStorageBytes($setting);

    while (
      count($frames) > $setting->max_image_count
      || $this->totalBytesFromMetadata($frames) > $maxBytes
    ) {
      $oldestFrame = $this->oldestFrameMetadata($frames);
      if ($oldestFrame === null) {
        return;
      }

      Storage::disk('local')->delete($oldestFrame['path']);
      $frames = array_values(array_filter(
        $frames,
        static fn(array $frame): bool => $frame['path'] !== $oldestFrame['path']
      ));
    }
  }

  /**
   * Launches a persistent FFmpeg process that captures frames from the camera's RTSP stream
   * at the configured sampling interval and saves them using strftime-based filenames.
   *
   * @return resource|null
   */
  private function launchFfmpegProcess(RawDataCollectionSetting $setting): mixed
  {
    $cameraSource = $setting->cameraSource;
    if (!($cameraSource instanceof CameraSource)) {
      return null;
    }

    if (!$setting->is_active || !$cameraSource->is_active) {
      return null;
    }

    $liveFeedUrl = $cameraSource->live_feed_url;
    if (!is_string($liveFeedUrl) || trim($liveFeedUrl) === '') {
      $this->logCameraSourceHealth(
        $cameraSource,
        'configuration_error',
        'Live feed URL is missing for the camera source.'
      );
      return null;
    }

    $storageDestination = $setting->storage_destination;
    if (!is_string($storageDestination) || trim($storageDestination) === '') {
      $this->logCameraSourceHealth(
        $cameraSource,
        'configuration_error',
        'Storage destination is missing for raw data collection.'
      );
      return null;
    }

    $normalizedStorageDestination = $this->normalizeStorageDestination($storageDestination);
    if ($normalizedStorageDestination === null) {
      $this->logCameraSourceHealth(
        $cameraSource,
        'configuration_error',
        'Storage destination is invalid for raw data collection.'
      );
      return null;
    }

    $framesDirectory = $normalizedStorageDestination . '/frames';
    Storage::disk('local')->makeDirectory($framesDirectory);

    $existingFrames = $this->listFrameMetadata($framesDirectory);
    if (!$this->canCaptureNewFrame($setting, $existingFrames)) {
      $this->logCameraSourceHealth(
        $cameraSource,
        'configuration_error',
        'Collection lifecycle condition prevents capturing new frames.'
      );
      return null;
    }

    $intervalSeconds = $this->samplingIntervalToSeconds($setting, $cameraSource);
    $outputExtension = $this->resolveOutputExtension($cameraSource);
    $absoluteFramesDir = Storage::disk('local')->path($framesDirectory);
    $outputPattern = $absoluteFramesDir . '/frame_%Y%m%d_%H%M%S.' . $outputExtension;

    $cmd = [
      $this->resolveFfmpegBinary($cameraSource),
      '-rtsp_transport', 'tcp',
      '-i', $liveFeedUrl,
      '-vf', 'fps=1/' . $intervalSeconds,
      '-strftime', '1',
      $outputPattern,
    ];

    $descriptors = [
      0 => ['pipe', 'r'],
      1 => ['file', '/dev/null', 'a'],
      2 => ['file', '/dev/null', 'a'],
    ];

    $process = proc_open($cmd, $descriptors, $pipes);

    if (!is_resource($process)) {
      $this->logCameraSourceHealth(
        $cameraSource,
        'connection_error',
        'Failed to launch FFmpeg frame capture process.'
      );
      return null;
    }

    if (isset($pipes[0])) {
      fclose($pipes[0]);
    }

    $this->logCameraSourceHealth(
      $cameraSource,
      'collecting',
      'Started continuous FFmpeg frame capture.'
    );

    return $process;
  }

  private function resolveFramesDirectory(RawDataCollectionSetting $setting): ?string
  {
    $storageDestination = $setting->storage_destination;
    if (!is_string($storageDestination) || trim($storageDestination) === '') {
      return null;
    }

    $normalized = $this->normalizeStorageDestination($storageDestination);
    return $normalized !== null ? $normalized . '/frames' : null;
  }

  private function resolveFfmpegBinary(CameraSource $cameraSource): string
  {
    $cameraSpecification = $cameraSource->camera_specification;
    if (is_array($cameraSpecification)) {
      $bin = $cameraSpecification['ffmpeg_binaries'] ?? null;
      if (is_string($bin) && trim($bin) !== '') {
        return trim($bin);
      }
    }

    return 'ffmpeg';
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
   * @param array<int, array{path: string, last_modified: int, size: int}> $frames
   */
  private function totalBytesFromMetadata(array $frames): int
  {
    return array_reduce($frames, static fn(int $carry, array $frame): int => $carry + $frame['size'], 0);
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

  private function resolveLocationTimezone(CameraSource $cameraSource): string
  {
    $timezone = $cameraSource->location?->timezone;

    return is_string($timezone) && trim($timezone) !== ''
      ? $timezone
      : (string) config('app.timezone');
  }

  private function logCameraSourceHealth(
    CameraSource $cameraSource,
    string $state,
    string $message,
    ?int $delay = null
  ): void
  {
    $normalizedState = strtolower(trim($state));
    $normalizedMessage = trim($message);
    $status = Str::limit(
      sprintf('%s%s%s', $normalizedState, self::STATUS_SEPARATOR, $normalizedMessage),
      255,
      ''
    );

    CameraSourceHealthLog::query()->create([
      'camera_source_id' => $cameraSource->id,
      'status' => $status,
      'delay' => $delay,
      'logged_at' => now(),
    ]);
  }

  private function elapsedCaptureDelay(float $captureStartedAt): int
  {
    return (int) max(0, round((microtime(true) - $captureStartedAt) * 1000));
  }

  /**
   * @return array{path: string, last_modified: int, size: int}
   */
  private function buildCapturedFrameMetadata(string $relativePath, string $absolutePath): array
  {
    clearstatcache(true, $absolutePath);
    $stats = stat($absolutePath);

    if (is_array($stats)) {
      $lastModified = $stats['mtime'] ?? null;
      $size = $stats['size'] ?? null;

      if (is_int($lastModified) && is_int($size)) {
        return [
          'path' => $relativePath,
          'last_modified' => $lastModified,
          'size' => $size,
        ];
      }
    }

    Log::warning('Unable to read captured frame metadata from file stats.', [
      'frame_path' => $relativePath,
      'absolute_path' => $absolutePath,
    ]);

    return [
      'path' => $relativePath,
      'last_modified' => Storage::disk('local')->lastModified($relativePath),
      'size' => Storage::disk('local')->size($relativePath),
    ];
  }

  /**
   * @return array<int, array{path: string, last_modified: int, size: int}>
   */
  private function listFrameMetadata(string $framesDirectory): array
  {
    return collect(Storage::disk('local')->allFiles($framesDirectory))
      ->filter(static function (string $path): bool {
        $filename = pathinfo($path, PATHINFO_FILENAME);
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return str_starts_with($filename, 'frame_')
          && in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tif', 'tiff'], true);
      })
      ->map(static function (string $path): array {
        return [
          'path' => $path,
          'last_modified' => Storage::disk('local')->lastModified($path),
          'size' => Storage::disk('local')->size($path),
        ];
      })
      ->values()
      ->all();
  }

  /**
   * @param array<int, array{path: string, last_modified: int, size: int}> $frames
   */
  private function latestFrameLastModified(array $frames): ?int
  {
    $latestFrameLastModified = collect($frames)->max('last_modified');

    if (is_int($latestFrameLastModified)) {
      return $latestFrameLastModified;
    }

    if (is_numeric($latestFrameLastModified)) {
      return (int) $latestFrameLastModified;
    }

    return null;
  }

  /**
   * @param array<int, array{path: string, last_modified: int, size: int}> $frames
   * @return array{path: string, last_modified: int, size: int}|null
   */
  private function oldestFrameMetadata(array $frames): ?array
  {
    return collect($frames)
      ->sortBy('last_modified')
      ->first();
  }
}
