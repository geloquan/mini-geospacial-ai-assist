<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Cast;
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
#[Cast([
    'camera_specification' => 'array',
    'yolo_model_metadata' => 'array',
])]
class CameraLocation extends Model
{
}
