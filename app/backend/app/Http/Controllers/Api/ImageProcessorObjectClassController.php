<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreImageProcessorObjectClassRequest;
use App\Http\Requests\Api\UpdateImageProcessorObjectClassRequest;
use App\Http\Resources\ImageProcessorObjectClassResource;
use App\Models\ImageProcessorObjectClass;
use App\Services\ImageProcessorObjectClassService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ImageProcessorObjectClassController extends Controller
{
    public function __construct(private readonly ImageProcessorObjectClassService $imageProcessorObjectClassService)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return ImageProcessorObjectClassResource::collection($this->imageProcessorObjectClassService->listAll());
    }

    public function store(StoreImageProcessorObjectClassRequest $request): ImageProcessorObjectClassResource
    {
        return new ImageProcessorObjectClassResource($this->imageProcessorObjectClassService->create($request->validated()));
    }

    public function show(ImageProcessorObjectClass $imageProcessorObjectClass): ImageProcessorObjectClassResource
    {
        return new ImageProcessorObjectClassResource($imageProcessorObjectClass);
    }

    public function update(UpdateImageProcessorObjectClassRequest $request, ImageProcessorObjectClass $imageProcessorObjectClass): ImageProcessorObjectClassResource
    {
        return new ImageProcessorObjectClassResource($this->imageProcessorObjectClassService->update($imageProcessorObjectClass, $request->validated()));
    }

    public function destroy(ImageProcessorObjectClass $imageProcessorObjectClass): Response
    {
        $this->imageProcessorObjectClassService->delete($imageProcessorObjectClass);

        return response()->noContent();
    }
}
