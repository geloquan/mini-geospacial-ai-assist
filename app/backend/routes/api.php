<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CameraLocationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Middleware\ApiTokenAuth;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware(ApiTokenAuth::class)->group(function (): void {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/locations', [CameraLocationController::class, 'index']);
    Route::post('/locations', [CameraLocationController::class, 'store']);
});
