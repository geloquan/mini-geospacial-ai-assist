<?php

namespace App\Services;

use App\Models\Location;
use Illuminate\Database\Eloquent\Collection;

class LocationService
{
    /**
     * @return Collection<int, Location>
     */
    public function listAll(): Collection
    {
        return Location::query()->latest()->get();
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
