<?php

namespace App\Services;

use App\Models\Location;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class LocationService
{
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
        return Location::query()->create($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(Location $location, array $data): Location
    {
        $location->fill($data);
        $location->save();

        return $location;
    }

    public function delete(Location $location): void
    {
        $location->delete();
    }
}
