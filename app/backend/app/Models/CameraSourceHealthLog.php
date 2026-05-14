<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'camera_source_id',
    'status',
    'delay',
    'logged_at',
])]
class CameraSourceHealthLog extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'logged_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<CameraSource, $this>
     */
    public function cameraSource(): BelongsTo
    {
        return $this->belongsTo(CameraSource::class);
    }
}
