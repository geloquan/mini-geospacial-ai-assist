<?php

namespace App\Services;

use App\Models\CameraSource;
use Illuminate\Database\Eloquent\Collection;

class CameraSourceService
{
    /**
     * @return Collection<int, CameraSource>
     */
    public function listAll(): Collection
    {
        return CameraSource::query()->latest()->get();
    }

    public function findById(int $id): CameraSource
    {
        return CameraSource::query()->findOrFail($id);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): CameraSource
    {
        return CameraSource::query()->create($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(CameraSource $cameraSource, array $data): CameraSource
    {
        $cameraSource->fill($data);
        $cameraSource->save();

        return $cameraSource;
    }

    public function delete(CameraSource $cameraSource): void
    {
        $cameraSource->delete();
    }
}
