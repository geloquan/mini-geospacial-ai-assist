<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCameraSourceHealthLogRequest;
use App\Http\Requests\Api\UpdateCameraSourceHealthLogRequest;
use App\Http\Resources\CameraSourceHealthLogResource;
use App\Models\CameraSourceHealthLog;
use App\Services\CameraSourceHealthLogService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class CameraSourceHealthLogController extends Controller
{
    public function __construct(private readonly CameraSourceHealthLogService $cameraSourceHealthLogService)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return CameraSourceHealthLogResource::collection($this->cameraSourceHealthLogService->listAll());
    }

    public function store(StoreCameraSourceHealthLogRequest $request): CameraSourceHealthLogResource
    {
        return new CameraSourceHealthLogResource($this->cameraSourceHealthLogService->create($request->validated()));
    }

    public function show(CameraSourceHealthLog $cameraSourceHealthLog): CameraSourceHealthLogResource
    {
        return new CameraSourceHealthLogResource($cameraSourceHealthLog);
    }

    public function update(UpdateCameraSourceHealthLogRequest $request, CameraSourceHealthLog $cameraSourceHealthLog): CameraSourceHealthLogResource
    {
        return new CameraSourceHealthLogResource($this->cameraSourceHealthLogService->update($cameraSourceHealthLog, $request->validated()));
    }

    public function destroy(CameraSourceHealthLog $cameraSourceHealthLog): Response
    {
        $this->cameraSourceHealthLogService->delete($cameraSourceHealthLog);

        return response()->noContent();
    }
}
