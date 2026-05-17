<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'location_id',
    'image_processor_id',
    'source_name',
    'camera_identifier',
    'live_feed_url',
    'camera_specification',
    'is_active',
])]
class CameraSource extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'camera_specification' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Location, $this>
     */
    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    /**
     * @return BelongsTo<ImageProcessor, $this>
     */
    public function imageProcessor(): BelongsTo
    {
        return $this->belongsTo(ImageProcessor::class);
    }

    /**
     * @return HasMany<PredictionThreshold, $this>
     */
    public function predictionThresholds(): HasMany
    {
        return $this->hasMany(PredictionThreshold::class);
    }

    /**
     * @return HasMany<CameraSourceHealthLog, $this>
     */
    public function healthLogs(): HasMany
    {
        return $this->hasMany(CameraSourceHealthLog::class);
    }

    /**
     * @return HasOne<CameraSourceHealthLog, $this>
     */
    public function latestHealthLog(): HasOne
    {
        return $this->hasOne(CameraSourceHealthLog::class)->latestOfMany('logged_at');
    }

    /**
     * @return array<string, mixed>
     */
    public function collectionStatus(): array
    {
        if (!$this->is_active) {
            return [
                'state' => 'inactive',
                'is_collecting' => false,
                'message' => 'Camera source is inactive.',
                'raw_status' => null,
                'delay' => null,
                'logged_at' => null,
            ];
        }

        $latestHealthLog = $this->relationLoaded('latestHealthLog')
            ? $this->latestHealthLog
            : $this->latestHealthLog()->first();

        if (!$latestHealthLog instanceof CameraSourceHealthLog) {
            return [
                'state' => 'unknown',
                'is_collecting' => false,
                'message' => 'No camera collection status has been reported yet.',
                'raw_status' => null,
                'delay' => null,
                'logged_at' => null,
            ];
        }

        $rawStatus = trim((string) $latestHealthLog->status);
        [$state, $isCollecting, $message] = $this->resolveCollectionStatus($rawStatus);

        return [
            'state' => $state,
            'is_collecting' => $isCollecting,
            'message' => $message,
            'raw_status' => $rawStatus !== '' ? $rawStatus : null,
            'delay' => $latestHealthLog->delay,
            'logged_at' => $latestHealthLog->logged_at?->toIso8601String(),
        ];
    }

    /**
     * @return array{0: string, 1: bool, 2: string}
     */
    private function resolveCollectionStatus(string $rawStatus): array
    {
        if ($rawStatus === '') {
            return ['unknown', false, 'No camera collection status has been reported yet.'];
        }

        [$state, $message] = array_pad(explode('|', $rawStatus, 2), 2, '');
        $normalizedState = strtolower(trim($state));
        $normalizedMessage = trim($message);

        return match ($normalizedState) {
            'collecting' => [
                'collecting',
                true,
                $normalizedMessage !== '' ? $normalizedMessage : 'Actively collecting data.',
            ],
            'inactive' => [
                'inactive',
                false,
                $normalizedMessage !== '' ? $normalizedMessage : 'Camera source is inactive.',
            ],
            'connection_error' => [
                'connection_error',
                false,
                $normalizedMessage !== '' ? $normalizedMessage : 'Camera connection issue detected.',
            ],
            'configuration_error' => [
                'configuration_error',
                false,
                $normalizedMessage !== '' ? $normalizedMessage : 'Raw data collection configuration issue detected.',
            ],
            default => ['unknown', false, $rawStatus],
        };
    }

    /**
     * @return HasMany<RawDataCollectionSetting, $this>
     */
    public function rawDataCollectionSettings(): HasMany
    {
        return $this->hasMany(RawDataCollectionSetting::class);
    }
}
