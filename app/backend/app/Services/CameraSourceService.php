<?php

namespace App\Services;

use App\Models\CameraSource;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CameraSourceService
{
    public function __construct(
        private readonly RawDataCollectionSettingService $rawDataCollectionSettingService
    ) {
    }

    public function listPaginated(int $perPage): LengthAwarePaginator
    {
        return CameraSource::query()
            ->with('latestHealthLog')
            ->latest()
            ->paginate($perPage);
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
        $this->rawDataCollectionSettingService->syncMetadataForCameraSource($cameraSource);

        return $cameraSource;
    }

    public function delete(CameraSource $cameraSource): void
    {
        $cameraSource->delete();
    }
}
