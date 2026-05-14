<?php

namespace App\Services;

use App\Models\CameraSourceHealthLog;
use Illuminate\Database\Eloquent\Collection;

class CameraSourceHealthLogService
{
    /**
     * @return Collection<int, CameraSourceHealthLog>
     */
    public function listAll(): Collection
    {
        return CameraSourceHealthLog::query()->latest()->get();
    }

    public function findById(int $id): CameraSourceHealthLog
    {
        return CameraSourceHealthLog::query()->findOrFail($id);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): CameraSourceHealthLog
    {
        return CameraSourceHealthLog::query()->create($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(CameraSourceHealthLog $cameraSourceHealthLog, array $data): CameraSourceHealthLog
    {
        $cameraSourceHealthLog->fill($data);
        $cameraSourceHealthLog->save();

        return $cameraSourceHealthLog;
    }

    public function delete(CameraSourceHealthLog $cameraSourceHealthLog): void
    {
        $cameraSourceHealthLog->delete();
    }
}
