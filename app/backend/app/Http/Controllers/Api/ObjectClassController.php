<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreObjectClassRequest;
use App\Http\Requests\Api\UpdateObjectClassRequest;
use App\Http\Resources\ObjectClassResource;
use App\Models\ObjectClass;
use App\Services\ObjectClassService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ObjectClassController extends Controller
{
    public function __construct(private readonly ObjectClassService $objectClassService)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return ObjectClassResource::collection($this->objectClassService->listAll());
    }

    public function store(StoreObjectClassRequest $request): ObjectClassResource
    {
        return new ObjectClassResource($this->objectClassService->create($request->validated()));
    }

    public function show(ObjectClass $objectClass): ObjectClassResource
    {
        return new ObjectClassResource($objectClass);
    }

    public function update(UpdateObjectClassRequest $request, ObjectClass $objectClass): ObjectClassResource
    {
        return new ObjectClassResource($this->objectClassService->update($objectClass, $request->validated()));
    }

    public function destroy(ObjectClass $objectClass): Response
    {
        $this->objectClassService->delete($objectClass);

        return response()->noContent();
    }
}
