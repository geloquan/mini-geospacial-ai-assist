<?php

namespace App\Jobs;

use App\Services\RawDataCollectionFrameCaptureService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class CaptureRawDataCollectionSettingFramesJob implements ShouldQueue
{
  use Queueable;

  private const FPS_PRECISION = 6;

  public int $tries = 1;
  public int $timeout = 120;

  public function __construct(
    private readonly int $rawDataCollectionSettingId,
    private readonly int $intervalSeconds
  ) {
    $this->onQueue('raw-data-collection');
  }

  public function handle(RawDataCollectionFrameCaptureService $frameCaptureService): void
  {
    $captureLockCacheKey = sprintf('raw-data-collection:setting:%d:capture-lock', $this->rawDataCollectionSettingId);
    $captureStartedAt = microtime(true);

    try {
      $captured = $frameCaptureService->captureScheduledById($this->rawDataCollectionSettingId);
      $targetFps = round(1 / max(1, $this->intervalSeconds), self::FPS_PRECISION);

      Log::info('Completed raw data frame capture job for setting.', [
        'raw_data_collection_setting_id' => $this->rawDataCollectionSettingId,
        'interval_seconds' => $this->intervalSeconds,
        'target_fps' => $targetFps,
        'achieved_fps' => $captured ? $targetFps : 0.0,
        'dropped_frames' => $captured ? 0 : 1,
        'captured' => $captured,
        'capture_duration_ms' => (int) max(0, round((microtime(true) - $captureStartedAt) * 1000)),
        'worker_memory_usage_bytes' => memory_get_usage(true),
      ]);
    } catch (Throwable $throwable) {
      Log::warning('Raw data frame capture job failed for setting.', [
        'raw_data_collection_setting_id' => $this->rawDataCollectionSettingId,
        'error' => $throwable->getMessage(),
      ]);

      throw $throwable;
    } finally {
      Cache::forget($captureLockCacheKey);
    }
  }
}
