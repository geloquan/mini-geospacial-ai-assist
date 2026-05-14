<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCameraSourceRequest;
use App\Http\Requests\Api\UpdateCameraSourceRequest;
use App\Http\Resources\CameraSourceResource;
use App\Models\CameraSource;
use App\Services\CameraSourceService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class CameraSourceController extends Controller
{
    public function __construct(private readonly CameraSourceService $cameraSourceService)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return CameraSourceResource::collection($this->cameraSourceService->listAll());
    }

    public function store(StoreCameraSourceRequest $request): CameraSourceResource
    {
        return new CameraSourceResource($this->cameraSourceService->create($request->validated()));
    }

    public function show(CameraSource $cameraSource): CameraSourceResource
    {
        return new CameraSourceResource($cameraSource);
    }

    public function update(UpdateCameraSourceRequest $request, CameraSource $cameraSource): CameraSourceResource
    {
        return new CameraSourceResource($this->cameraSourceService->update($cameraSource, $request->validated()));
    }

    public function destroy(CameraSource $cameraSource): Response
    {
        $this->cameraSourceService->delete($cameraSource);

        return response()->noContent();
    }
}
