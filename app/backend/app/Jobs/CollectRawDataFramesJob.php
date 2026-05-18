<?php

namespace App\Jobs;

use App\Jobs\CaptureRawDataCollectionSettingFramesJob;
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

  private const DISPATCH_CURSOR_TTL_MINUTES = 10;

  public int $timeout = 60;

  public function __construct()
  {
    $this->onQueue('raw-data-collection');
  }

  public function handle(RawDataCollectionFrameCaptureService $frameCaptureService): void
  {
    $dispatchConfig = $this->resolveDispatchConfig();
    $maxCamerasPerNode = $dispatchConfig['max_cameras_per_node'];
    $maxDispatchPerTick = $dispatchConfig['max_dispatch_per_tick'];
    $jobLockTtlSeconds = $dispatchConfig['capture_job_lock_ttl_seconds'];
    $intervalCacheTtlFloorSeconds = $dispatchConfig['interval_due_cache_ttl_floor_seconds'];
    $intervalCacheTtlMultiplier = $dispatchConfig['interval_due_cache_ttl_multiplier'];
    $baseScheduledSettingsQuery = RawDataCollectionSetting::query()
      ->where('collection_type', 'scheduled_capture')
      ->where('is_active', true)
      ->whereHas('cameraSource', static function (Builder $query): void {
        $query->where('is_active', true);
      });

    $activeScheduledSettingsCount = (clone $baseScheduledSettingsQuery)->count();
    $dispatchCursorCacheKey = 'raw-data-collection:dispatch-cursor:last-setting-id';
    $lastDispatchedSettingId = (int) Cache::get($dispatchCursorCacheKey, 0);
    $remainingCapacity = $maxCamerasPerNode;

    $scheduledSettings = (clone $baseScheduledSettingsQuery)
      ->with('cameraSource')
      ->where('id', '>', $lastDispatchedSettingId)
      ->orderBy('id')
      ->limit($remainingCapacity)
      ->get();
    $remainingCapacity -= $scheduledSettings->count();

    if ($remainingCapacity > 0) {
      $wrappedSettings = (clone $baseScheduledSettingsQuery)
        ->with('cameraSource')
        ->where('id', '<=', $lastDispatchedSettingId)
        ->orderBy('id')
        ->limit($remainingCapacity)
        ->get();
      $scheduledSettings = $scheduledSettings->concat($wrappedSettings);
    }

    $dispatchBudget = $maxDispatchPerTick;
    $cappedSettings = max(0, $activeScheduledSettingsCount - $maxCamerasPerNode);
    $deferredNoCapacity = 0;
    $deferredNotDue = 0;
    $deferredInFlight = 0;
    $dispatchedCount = 0;
    $lastEvaluatedSettingId = 0;
    $now = time();
    $loadAverages = function_exists('sys_getloadavg') ? sys_getloadavg() : null;
    $scheduledSettingsCount = $scheduledSettings->count();
    $currentSettingIndex = 0;

    foreach ($scheduledSettings as $setting) {
      $currentSettingIndex++;
      $lastEvaluatedSettingId = (int) $setting->id;

      if ($dispatchBudget <= 0) {
        $deferredNoCapacity += $scheduledSettings->slice($currentSettingIndex - 1)->count();
        break;
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
        now()->addSeconds(max($intervalCacheTtlFloorSeconds, $intervalSeconds * $intervalCacheTtlMultiplier))
      );
      $dispatchBudget--;
      $dispatchedCount++;
    }

    if ($lastEvaluatedSettingId > 0) {
      Cache::put(
        $dispatchCursorCacheKey,
        $lastEvaluatedSettingId,
        now()->addMinutes(self::DISPATCH_CURSOR_TTL_MINUTES)
      );
    } else {
      Cache::forget($dispatchCursorCacheKey);
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

  /**
   * @return array{
   *   max_cameras_per_node: int,
   *   max_dispatch_per_tick: int,
   *   capture_job_lock_ttl_seconds: int,
   *   interval_due_cache_ttl_floor_seconds: int,
   *   interval_due_cache_ttl_multiplier: int
   * }
   */
  private function resolveDispatchConfig(): array
  {
    return [
      'max_cameras_per_node' => max(1, (int) config('raw_data_collection.max_cameras_per_node', 50)),
      'max_dispatch_per_tick' => max(1, (int) config('raw_data_collection.max_dispatch_per_tick', 10)),
      'capture_job_lock_ttl_seconds' => max(5, (int) config('raw_data_collection.capture_job_lock_ttl_seconds', 120)),
      'interval_due_cache_ttl_floor_seconds' => max(5, (int) config('raw_data_collection.interval_due_cache_ttl_floor_seconds', 60)),
      'interval_due_cache_ttl_multiplier' => max(1, (int) config('raw_data_collection.interval_due_cache_ttl_multiplier', 2)),
    ];
  }
}
