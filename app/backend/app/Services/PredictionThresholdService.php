<?php

namespace App\Services;

use App\Models\PredictionThreshold;
use Illuminate\Database\Eloquent\Collection;

class PredictionThresholdService
{
    /**
     * @return Collection<int, PredictionThreshold>
     */
    public function listAll(): Collection
    {
        return PredictionThreshold::query()->latest()->get();
    }

    public function findById(int $id): PredictionThreshold
    {
        return PredictionThreshold::query()->findOrFail($id);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): PredictionThreshold
    {
        return PredictionThreshold::query()->create($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(PredictionThreshold $predictionThreshold, array $data): PredictionThreshold
    {
        $predictionThreshold->fill($data);
        $predictionThreshold->save();

        return $predictionThreshold;
    }

    public function delete(PredictionThreshold $predictionThreshold): void
    {
        $predictionThreshold->delete();
    }
}
