<?php

namespace App\Services;

use App\Models\ImageProcessor;
use Illuminate\Database\Eloquent\Collection;

class ImageProcessorService
{
    /**
     * @return Collection<int, ImageProcessor>
     */
    public function listAll(): Collection
    {
        return ImageProcessor::query()->latest()->get();
    }

    public function findById(int $id): ImageProcessor
    {
        return ImageProcessor::query()->findOrFail($id);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): ImageProcessor
    {
        return ImageProcessor::query()->create($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(ImageProcessor $imageProcessor, array $data): ImageProcessor
    {
        $imageProcessor->fill($data);
        $imageProcessor->save();

        return $imageProcessor;
    }

    public function delete(ImageProcessor $imageProcessor): void
    {
        $imageProcessor->delete();
    }
}
