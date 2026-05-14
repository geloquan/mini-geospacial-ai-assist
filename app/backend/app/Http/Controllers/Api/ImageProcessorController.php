<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreImageProcessorRequest;
use App\Http\Requests\Api\UpdateImageProcessorRequest;
use App\Http\Resources\ImageProcessorResource;
use App\Models\ImageProcessor;
use App\Services\ImageProcessorService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ImageProcessorController extends Controller
{
    public function __construct(private readonly ImageProcessorService $imageProcessorService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = max(1, min((int) $request->query('per_page', 15), 100));

        return ImageProcessorResource::collection($this->imageProcessorService->listPaginated($perPage));
    }

    public function store(StoreImageProcessorRequest $request): ImageProcessorResource
    {
        return new ImageProcessorResource($this->imageProcessorService->create($request->validated()));
    }

    public function show(ImageProcessor $imageProcessor): ImageProcessorResource
    {
        return new ImageProcessorResource($imageProcessor);
    }

    public function update(UpdateImageProcessorRequest $request, ImageProcessor $imageProcessor): ImageProcessorResource
    {
        return new ImageProcessorResource($this->imageProcessorService->update($imageProcessor, $request->validated()));
    }

    public function destroy(ImageProcessor $imageProcessor): Response
    {
        $this->imageProcessorService->delete($imageProcessor);

        return response()->noContent();
    }
}
