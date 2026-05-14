<?php

namespace App\Services;

use App\Models\ObjectClassAlias;
use Illuminate\Database\Eloquent\Collection;

class ObjectClassAliasService
{
    /**
     * @return Collection<int, ObjectClassAlias>
     */
    public function listAll(): Collection
    {
        return ObjectClassAlias::query()->latest()->get();
    }

    public function findById(int $id): ObjectClassAlias
    {
        return ObjectClassAlias::query()->findOrFail($id);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): ObjectClassAlias
    {
        return ObjectClassAlias::query()->create($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(ObjectClassAlias $objectClassAlias, array $data): ObjectClassAlias
    {
        $objectClassAlias->fill($data);
        $objectClassAlias->save();

        return $objectClassAlias;
    }

    public function delete(ObjectClassAlias $objectClassAlias): void
    {
        $objectClassAlias->delete();
    }
}
