<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Resources\AuthResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function login(LoginRequest $request): AuthResource|JsonResponse
    {
        $authData = $this->authService->login(
            $request->string('username')->toString(),
            $request->string('password')->toString(),
        );

        if ($authData === null) {
            return new JsonResponse([
                'message' => 'Invalid username or password.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return new AuthResource($authData);
    }
}
