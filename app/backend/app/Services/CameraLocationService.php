<?php

namespace App\Services;

use App\Models\CameraLocation;
use Illuminate\Database\Eloquent\Collection;

class CameraLocationService
{
    /**
     * @return Collection<int, CameraLocation>
     */
    public function listAll(): Collection
    {
        return CameraLocation::query()
            ->latest()
            ->get();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): CameraLocation
    {
        return CameraLocation::query()->create($data);
    }
}
