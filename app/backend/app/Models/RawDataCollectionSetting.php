<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'camera_source_id',
    'storage_destination',
    'max_storage_size_mb',
    'max_image_count',
    'lifecycle_strategy',
    'frame_sampling_interval_value',
    'frame_sampling_interval_unit',
    'collection_context_notes',
    'collection_type',
])]
class RawDataCollectionSetting extends Model
{
    /**
     * @return BelongsTo<CameraSource, $this>
     */
    public function cameraSource(): BelongsTo
    {
        return $this->belongsTo(CameraSource::class);
    }
}
