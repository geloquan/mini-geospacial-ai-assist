<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreRawDataCollectionSettingRequest;
use App\Http\Requests\Api\UpdateRawDataCollectionSettingRequest;
use App\Http\Resources\RawDataCollectionGalleryResource;
use App\Http\Resources\RawDataCollectionSettingResource;
use App\Models\RawDataCollectionSetting;
use App\Services\RawDataCollectionSettingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class RawDataCollectionSettingController extends Controller
{
    public function __construct(private readonly RawDataCollectionSettingService $rawDataCollectionSettingService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = max(1, min((int) $request->query('per_page', 15), 100));

        return RawDataCollectionSettingResource::collection($this->rawDataCollectionSettingService->listPaginated($perPage));
    }

    public function store(StoreRawDataCollectionSettingRequest $request): RawDataCollectionSettingResource
    {
        return new RawDataCollectionSettingResource($this->rawDataCollectionSettingService->create($request->validated()));
    }

    public function show(RawDataCollectionSetting $rawDataCollectionSetting): RawDataCollectionSettingResource
    {
        return new RawDataCollectionSettingResource($rawDataCollectionSetting);
    }

    public function gallery(RawDataCollectionSetting $rawDataCollectionSetting): RawDataCollectionGalleryResource
    {
        return new RawDataCollectionGalleryResource(
            $this->rawDataCollectionSettingService->buildGalleryPayload($rawDataCollectionSetting)
        );
    }

    public function update(UpdateRawDataCollectionSettingRequest $request, RawDataCollectionSetting $rawDataCollectionSetting): RawDataCollectionSettingResource
    {
        return new RawDataCollectionSettingResource($this->rawDataCollectionSettingService->update($rawDataCollectionSetting, $request->validated()));
    }

    public function destroy(RawDataCollectionSetting $rawDataCollectionSetting): Response
    {
        $this->rawDataCollectionSettingService->delete($rawDataCollectionSetting);

        return response()->noContent();
    }
}
