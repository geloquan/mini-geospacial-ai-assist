<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreLocationRequest;
use App\Http\Requests\Api\UpdateLocationRequest;
use App\Http\Resources\LocationResource;
use App\Models\Location;
use App\Services\LocationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class LocationController extends Controller
{
    public function __construct(private readonly LocationService $locationService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = max(1, min((int) $request->query('per_page', 15), 100));

        return LocationResource::collection($this->locationService->listPaginated($perPage));
    }

    public function store(StoreLocationRequest $request): LocationResource
    {
        return new LocationResource($this->locationService->create($request->validated()));
    }

    public function show(Location $location): LocationResource
    {
        return new LocationResource($location);
    }

    public function update(UpdateLocationRequest $request, Location $location): LocationResource
    {
        return new LocationResource($this->locationService->update($location, $request->validated()));
    }

    public function destroy(Location $location): Response
    {
        $this->locationService->delete($location);

        return response()->noContent();
    }
}
