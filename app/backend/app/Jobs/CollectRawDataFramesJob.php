<?php

namespace App\Jobs;

use App\Models\RawDataCollectionSetting;
use App\Services\RawDataCollectionFrameCaptureService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CollectRawDataFramesJob implements ShouldQueue
{
  use Queueable;

  private const INTERVAL_CACHE_TTL_MULTIPLIER = 2;

  public int $timeout = 60;

  public function __construct()
  {
    $this->onQueue('raw-data-collection');
  }

  public function handle(RawDataCollectionFrameCaptureService $frameCaptureService): void
  {
    $maxCamerasPerNode = max(1, (int) config('raw_data_collection.max_cameras_per_node', 50));
    $maxDispatchPerTick = max(1, (int) config('raw_data_collection.max_dispatch_per_tick', 10));
    $jobLockTtlSeconds = max(5, (int) config('raw_data_collection.capture_job_lock_ttl_seconds', 120));
    $intervalCacheTtlFloorSeconds = max(5, (int) config('raw_data_collection.interval_due_cache_ttl_floor_seconds', 60));
    $baseScheduledSettingsQuery = RawDataCollectionSetting::query()
      ->where('collection_type', 'scheduled_capture')
      ->where('is_active', true)
      ->whereHas('cameraSource', static function (Builder $query): void {
        $query->where('is_active', true);
      });

    $activeScheduledSettingsCount = (clone $baseScheduledSettingsQuery)->count();

    $scheduledSettings = (clone $baseScheduledSettingsQuery)
      ->with('cameraSource')
      ->orderBy('id')
      ->limit($maxCamerasPerNode)
      ->get();

    $dispatchBudget = $maxDispatchPerTick;
    $cappedSettings = max(0, $activeScheduledSettingsCount - $maxCamerasPerNode);
    $deferredNoCapacity = 0;
    $deferredNotDue = 0;
    $deferredInFlight = 0;
    $dispatchedCount = 0;
    $now = time();
    $loadAverages = function_exists('sys_getloadavg') ? sys_getloadavg() : null;

    foreach ($scheduledSettings as $setting) {
      if ($dispatchBudget <= 0) {
        $deferredNoCapacity++;
        continue;
      }

      $settingId = (int) $setting->id;
      $intervalSeconds = $frameCaptureService->resolveSamplingIntervalSeconds($setting);
      $nextDueCacheKey = sprintf('raw-data-collection:setting:%d:next-due-at', $settingId);
      $nextDueAt = (int) Cache::get($nextDueCacheKey, 0);
      if ($nextDueAt > $now) {
        $deferredNotDue++;
        continue;
      }

      $captureLockCacheKey = sprintf('raw-data-collection:setting:%d:capture-lock', $settingId);
      if (!Cache::add($captureLockCacheKey, $now, now()->addSeconds($jobLockTtlSeconds))) {
        $deferredInFlight++;
        continue;
      }

      CaptureRawDataCollectionSettingFramesJob::dispatch($settingId, $intervalSeconds);
      Cache::put(
        $nextDueCacheKey,
        $now + $intervalSeconds,
        now()->addSeconds(max($intervalCacheTtlFloorSeconds, $intervalSeconds * self::INTERVAL_CACHE_TTL_MULTIPLIER))
      );
      $dispatchBudget--;
      $dispatchedCount++;
    }

    Log::info('Completed scheduled raw data frame dispatch tick.', [
      'active_scheduled_settings' => $activeScheduledSettingsCount,
      'capped_settings' => $cappedSettings,
      'max_cameras_per_node' => $maxCamerasPerNode,
      'max_dispatch_per_tick' => $maxDispatchPerTick,
      'dispatched_count' => $dispatchedCount,
      'deferred_not_due_count' => $deferredNotDue,
      'deferred_in_flight_count' => $deferredInFlight,
      'deferred_no_capacity_count' => $deferredNoCapacity,
      'worker_memory_usage_bytes' => memory_get_usage(true),
      'worker_memory_peak_usage_bytes' => memory_get_peak_usage(true),
      'worker_load_avg_1m' => is_array($loadAverages) ? ($loadAverages[0] ?? null) : null,
      'worker_load_avg_5m' => is_array($loadAverages) ? ($loadAverages[1] ?? null) : null,
      'worker_load_avg_15m' => is_array($loadAverages) ? ($loadAverages[2] ?? null) : null,
    ]);
  }
}
