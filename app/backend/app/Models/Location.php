<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'location_name',
    'descriptive_location',
    'latitude',
    'longitude',
])]
class Location extends Model
{
    /**
     * @return HasMany<CameraSource, $this>
     */
    public function cameraSources(): HasMany
    {
        return $this->hasMany(CameraSource::class);
    }
}
