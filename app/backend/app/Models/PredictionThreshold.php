<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'camera_source_id',
    'image_processor_id',
    'object_class_id',
    'confidence_threshold',
    'iou_threshold',
])]
class PredictionThreshold extends Model
{
    /**
     * @return BelongsTo<CameraSource, $this>
     */
    public function cameraSource(): BelongsTo
    {
        return $this->belongsTo(CameraSource::class);
    }

    /**
     * @return BelongsTo<ImageProcessor, $this>
     */
    public function imageProcessor(): BelongsTo
    {
        return $this->belongsTo(ImageProcessor::class);
    }

    /**
     * @return BelongsTo<ObjectClass, $this>
     */
    public function objectClass(): BelongsTo
    {
        return $this->belongsTo(ObjectClass::class);
    }
}
