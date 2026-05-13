<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCameraLocationRequest;
use App\Http\Resources\CameraLocationResource;
use App\Services\CameraLocationService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CameraLocationController extends Controller
{
    public function __construct(private readonly CameraLocationService $cameraLocationService)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return CameraLocationResource::collection(
            $this->cameraLocationService->listAll(),
        );
    }

    public function store(StoreCameraLocationRequest $request): CameraLocationResource
    {
        return new CameraLocationResource(
            $this->cameraLocationService->create($request->validated()),
        );
    }
}
