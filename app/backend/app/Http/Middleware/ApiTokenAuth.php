<?php

namespace App\Http\Middleware;

use App\Services\AuthService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiTokenAuth
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if ($token === null) {
            return new JsonResponse([
                'message' => 'Unauthorized.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $user = $this->authService->userFromToken($token);

        if ($user === null) {
            return new JsonResponse([
                'message' => 'Unauthorized.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
