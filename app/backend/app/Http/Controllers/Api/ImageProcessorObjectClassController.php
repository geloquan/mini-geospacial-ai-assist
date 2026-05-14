<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreImageProcessorObjectClassRequest;
use App\Http\Requests\Api\UpdateImageProcessorObjectClassRequest;
use App\Http\Resources\ImageProcessorObjectClassResource;
use App\Models\ImageProcessorObjectClass;
use App\Services\ImageProcessorObjectClassService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ImageProcessorObjectClassController extends Controller
{
    public function __construct(private readonly ImageProcessorObjectClassService $imageProcessorObjectClassService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = max(1, min((int) $request->query('per_page', 15), 100));

        return ImageProcessorObjectClassResource::collection($this->imageProcessorObjectClassService->listPaginated($perPage));
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
