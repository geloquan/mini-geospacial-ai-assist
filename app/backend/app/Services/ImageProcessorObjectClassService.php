<?php

namespace App\Services;

use App\Models\ImageProcessorObjectClass;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ImageProcessorObjectClassService
{
    public function listPaginated(int $perPage): LengthAwarePaginator
    {
        return ImageProcessorObjectClass::query()->latest()->paginate($perPage);
    }

    public function findById(int $id): ImageProcessorObjectClass
    {
        return ImageProcessorObjectClass::query()->findOrFail($id);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): ImageProcessorObjectClass
    {
        return ImageProcessorObjectClass::query()->create($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(ImageProcessorObjectClass $imageProcessorObjectClass, array $data): ImageProcessorObjectClass
    {
        $imageProcessorObjectClass->fill($data);
        $imageProcessorObjectClass->save();

        return $imageProcessorObjectClass;
    }

    public function delete(ImageProcessorObjectClass $imageProcessorObjectClass): void
    {
        $imageProcessorObjectClass->delete();
    }
}
