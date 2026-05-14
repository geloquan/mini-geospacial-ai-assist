<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
}
