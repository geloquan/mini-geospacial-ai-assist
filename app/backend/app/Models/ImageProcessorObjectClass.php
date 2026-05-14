<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'image_processor_id',
    'object_class_id',
    'is_enabled',
])]
class ImageProcessorObjectClass extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
        ];
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
