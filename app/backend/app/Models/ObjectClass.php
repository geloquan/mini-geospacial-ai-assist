<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'slug',
    'display_name',
    'description',
])]
class ObjectClass extends Model
{
    /**
     * @return HasMany<ObjectClassAlias, $this>
     */
    public function aliases(): HasMany
    {
        return $this->hasMany(ObjectClassAlias::class);
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
     * @return BelongsToMany<ImageProcessor, $this>
     */
    public function imageProcessors(): BelongsToMany
    {
        return $this->belongsToMany(ImageProcessor::class, 'image_processor_object_classes')
            ->withPivot('is_enabled')
            ->withTimestamps();
    }
}
