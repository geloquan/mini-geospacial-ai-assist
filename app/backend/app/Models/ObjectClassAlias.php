<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'object_class_id',
    'alias',
])]
class ObjectClassAlias extends Model
{
    /**
     * @return BelongsTo<ObjectClass, $this>
     */
    public function objectClass(): BelongsTo
    {
        return $this->belongsTo(ObjectClass::class);
    }
}
