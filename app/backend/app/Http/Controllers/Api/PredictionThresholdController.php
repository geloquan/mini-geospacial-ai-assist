<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StorePredictionThresholdRequest;
use App\Http\Requests\Api\UpdatePredictionThresholdRequest;
use App\Http\Resources\PredictionThresholdResource;
use App\Models\PredictionThreshold;
use App\Services\PredictionThresholdService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PredictionThresholdController extends Controller
{
    public function __construct(private readonly PredictionThresholdService $predictionThresholdService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = max(1, min((int) $request->query('per_page', 15), 100));

        return PredictionThresholdResource::collection($this->predictionThresholdService->listPaginated($perPage));
    }

    public function store(StorePredictionThresholdRequest $request): PredictionThresholdResource
    {
        return new PredictionThresholdResource($this->predictionThresholdService->create($request->validated()));
    }

    public function show(PredictionThreshold $predictionThreshold): PredictionThresholdResource
    {
        return new PredictionThresholdResource($predictionThreshold);
    }

    public function update(UpdatePredictionThresholdRequest $request, PredictionThreshold $predictionThreshold): PredictionThresholdResource
    {
        return new PredictionThresholdResource($this->predictionThresholdService->update($predictionThreshold, $request->validated()));
    }

    public function destroy(PredictionThreshold $predictionThreshold): Response
    {
        $this->predictionThresholdService->delete($predictionThreshold);

        return response()->noContent();
    }
}
