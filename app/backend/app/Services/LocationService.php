<?php

namespace App\Services;

use App\Models\Location;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class LocationService
{
    public function __construct(
        private readonly RawDataCollectionSettingService $rawDataCollectionSettingService
    ) {
    }

    public function listPaginated(int $perPage): LengthAwarePaginator
    {
        return Location::query()->latest()->paginate($perPage);
    }

    public function findById(int $id): Location
    {
        return Location::query()->findOrFail($id);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): Location
    {
        return Location::query()->create($this->normalizeLocationData($data, true));
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(Location $location, array $data): Location
    {
        $location->fill($this->normalizeLocationData($data));
        $location->save();
        $this->rawDataCollectionSettingService->syncMetadataForLocation($location);

        return $location;
    }

    public function delete(Location $location): void
    {
        $location->delete();
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function normalizeLocationData(array $data, bool $setDefaultTimezone = false): array
    {
        if ($setDefaultTimezone && !array_key_exists('timezone', $data)) {
            $data['timezone'] = config('app.timezone');
        }

        return $data;
    }
}
