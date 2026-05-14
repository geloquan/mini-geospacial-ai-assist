<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'location_name',
    'descriptive_location',
    'camera_identifier',
    'live_feed_url',
    'camera_specification',
    'yolo_model_metadata',
    'latitude',
    'longitude',
])]
class CameraLocation extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'camera_specification' => 'array',
            'yolo_model_metadata' => 'array',
        ];
    }
}
