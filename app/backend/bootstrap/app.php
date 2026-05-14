<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (Throwable $exception, Request $request): ?JsonResponse {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($exception instanceof ValidationException) {
                return response()->json([
                    'message' => $exception->getMessage(),
                    'errors' => $exception->errors(),
                ], $exception->status);
            }

            $statusCode = $exception instanceof HttpExceptionInterface
                ? $exception->getStatusCode()
                : Response::HTTP_INTERNAL_SERVER_ERROR;

            $message = trim($exception->getMessage());

            if ($message === '') {
                $message = match ($statusCode) {
                    Response::HTTP_BAD_REQUEST => 'Bad Request',
                    Response::HTTP_UNAUTHORIZED => 'Unauthorized',
                    Response::HTTP_FORBIDDEN => 'Forbidden',
                    Response::HTTP_NOT_FOUND => 'Not Found',
                    Response::HTTP_METHOD_NOT_ALLOWED => 'Method Not Allowed',
                    Response::HTTP_UNPROCESSABLE_ENTITY => 'Unprocessable Entity',
                    Response::HTTP_TOO_MANY_REQUESTS => 'Too Many Requests',
                    Response::HTTP_INTERNAL_SERVER_ERROR => 'Internal Server Error',
                    Response::HTTP_SERVICE_UNAVAILABLE => 'Service Unavailable',
                    default => 'Request failed.',
                };
            }

            if ($statusCode === Response::HTTP_INTERNAL_SERVER_ERROR && ! config('app.debug')) {
                $message = 'Internal Server Error.';
            }

            return response()->json([
                'message' => $message,
            ], $statusCode);
        });
    })->create();
