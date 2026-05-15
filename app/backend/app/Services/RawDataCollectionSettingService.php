<?php

namespace App\Services;

use App\Models\RawDataCollectionSetting;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class RawDataCollectionSettingService
{
    public function listPaginated(int $perPage): LengthAwarePaginator
    {
        return RawDataCollectionSetting::query()->latest()->paginate($perPage);
    }

    public function findById(int $id): RawDataCollectionSetting
    {
        return RawDataCollectionSetting::query()->findOrFail($id);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): RawDataCollectionSetting
    {
        return RawDataCollectionSetting::query()->create($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(RawDataCollectionSetting $rawDataCollectionSetting, array $data): RawDataCollectionSetting
    {
        $rawDataCollectionSetting->fill($data);
        $rawDataCollectionSetting->save();

        return $rawDataCollectionSetting;
    }

    public function delete(RawDataCollectionSetting $rawDataCollectionSetting): void
    {
        $rawDataCollectionSetting->delete();
    }
}
