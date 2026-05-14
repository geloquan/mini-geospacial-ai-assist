<?php

namespace App\Services;

use App\Models\ObjectClass;
use Illuminate\Database\Eloquent\Collection;

class ObjectClassService
{
    /**
     * @return Collection<int, ObjectClass>
     */
    public function listAll(): Collection
    {
        return ObjectClass::query()->latest()->get();
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
