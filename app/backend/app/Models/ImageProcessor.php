<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'model_name',
    'model_version',
    'metadata',
    'is_active',
])]
class ImageProcessor extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<CameraSource, $this>
     */
    public function cameraSources(): HasMany
    {
        return $this->hasMany(CameraSource::class);
    }

    /**
     * @return HasMany<ImageProcessorObjectClass, $this>
     */
    public function imageProcessorObjectClasses(): HasMany
    {
        return $this->hasMany(ImageProcessorObjectClass::class);
    }

    /**
     * @return HasMany<PredictionThreshold, $this>
     */
    public function predictionThresholds(): HasMany
    {
        return $this->hasMany(PredictionThreshold::class);
    }

    /**
     * @return BelongsToMany<ObjectClass, $this>
     */
    public function objectClasses(): BelongsToMany
    {
        return $this->belongsToMany(ObjectClass::class, 'image_processor_object_classes')
            ->withPivot('is_enabled')
            ->withTimestamps();
    }
}
