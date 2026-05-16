<?php

namespace App\Services;

use App\Models\CameraSource;
use App\Models\RawDataCollectionSetting;
use FFMpeg\Coordinate\TimeCode;
use FFMpeg\FFMpeg;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
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

        $framesDirectory = trim($storageDestination, '/').'/frames';
        Storage::disk('local')->makeDirectory($framesDirectory);

        $existingFramePaths = $this->listFramePaths($framesDirectory);

        if (!$forceCapture && !$this->isDueForCapture($setting, $existingFramePaths, $cameraSource)) {
            return false;
        }

        if (!$this->canCaptureNewFrame($setting, $existingFramePaths)) {
            return false;
        }

        $newFrameRelativePath = $framesDirectory.'/frame_'.now()->format('Ymd_His_u').'.jpg';
        $newFrameAbsolutePath = Storage::disk('local')->path($newFrameRelativePath);

        $ffmpeg = FFMpeg::create($this->buildFfmpegConfiguration($cameraSource));

        try {
            $ffmpeg->open($liveFeedUrl)->frame(TimeCode::fromSeconds(0))->save($newFrameAbsolutePath);
        } catch (Throwable $throwable) {
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
        array $framePaths,
        CameraSource $cameraSource
    ): bool {
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
                static fn (string $path): bool => $path !== $oldestFramePath
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
        CameraSource $cameraSource
    ): int {
        $intervalValue = max(1, (int) $setting->frame_sampling_interval_value);

        if ($setting->frame_sampling_interval_unit === 'seconds') {
            return $intervalValue;
        }

        $fps = null;
        $cameraSpecification = $cameraSource->camera_specification;
        if (is_array($cameraSpecification) && isset($cameraSpecification['fps'])) {
            $parsedFps = is_numeric($cameraSpecification['fps'])
                ? (float) $cameraSpecification['fps']
                : null;

            if ($parsedFps !== null && $parsedFps > 0) {
                $fps = $parsedFps;
            }
        }

        if ($fps === null) {
            return 1;
        }

        return max(1, (int) ceil($intervalValue / $fps));
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
        $maxStorageMb = max(1, (int) $setting->max_storage_size_mb);

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
            ->sortByDesc(static fn (string $path): int => Storage::disk('local')->lastModified($path))
            ->first();
    }

    /**
     * @param array<int, string> $framePaths
     */
    private function oldestFramePath(array $framePaths): ?string
    {
        return collect($framePaths)
            ->sortBy(static fn (string $path): int => Storage::disk('local')->lastModified($path))
            ->first();
    }
}
