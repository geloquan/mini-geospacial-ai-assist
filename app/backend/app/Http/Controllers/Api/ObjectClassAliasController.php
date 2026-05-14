<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreObjectClassAliasRequest;
use App\Http\Requests\Api\UpdateObjectClassAliasRequest;
use App\Http\Resources\ObjectClassAliasResource;
use App\Models\ObjectClassAlias;
use App\Services\ObjectClassAliasService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ObjectClassAliasController extends Controller
{
    public function __construct(private readonly ObjectClassAliasService $objectClassAliasService)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return ObjectClassAliasResource::collection($this->objectClassAliasService->listAll());
    }

    public function store(StoreObjectClassAliasRequest $request): ObjectClassAliasResource
    {
        return new ObjectClassAliasResource($this->objectClassAliasService->create($request->validated()));
    }

    public function show(ObjectClassAlias $objectClassAlias): ObjectClassAliasResource
    {
        return new ObjectClassAliasResource($objectClassAlias);
    }

    public function update(UpdateObjectClassAliasRequest $request, ObjectClassAlias $objectClassAlias): ObjectClassAliasResource
    {
        return new ObjectClassAliasResource($this->objectClassAliasService->update($objectClassAlias, $request->validated()));
    }

    public function destroy(ObjectClassAlias $objectClassAlias): Response
    {
        $this->objectClassAliasService->delete($objectClassAlias);

        return response()->noContent();
    }
}
