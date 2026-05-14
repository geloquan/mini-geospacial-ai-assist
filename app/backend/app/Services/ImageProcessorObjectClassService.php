<?php

namespace App\Services;

use App\Models\ImageProcessorObjectClass;
use Illuminate\Database\Eloquent\Collection;

class ImageProcessorObjectClassService
{
    /**
     * @return Collection<int, ImageProcessorObjectClass>
     */
    public function listAll(): Collection
    {
        return ImageProcessorObjectClass::query()->latest()->get();
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
