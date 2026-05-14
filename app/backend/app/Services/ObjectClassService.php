<?php

namespace App\Services;

use App\Models\ObjectClass;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ObjectClassService
{
    public function listPaginated(int $perPage): LengthAwarePaginator
    {
        return ObjectClass::query()->latest()->paginate($perPage);
    }

    public function findById(int $id): ObjectClass
    {
        return ObjectClass::query()->findOrFail($id);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): ObjectClass
    {
        return ObjectClass::query()->create($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(ObjectClass $objectClass, array $data): ObjectClass
    {
        $objectClass->fill($data);
        $objectClass->save();

        return $objectClass;
    }

    public function delete(ObjectClass $objectClass): void
    {
        $objectClass->delete();
    }
}
