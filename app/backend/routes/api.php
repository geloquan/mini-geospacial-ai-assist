<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CameraSourceController;
use App\Http\Controllers\Api\CameraSourceHealthLogController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ImageProcessorController;
use App\Http\Controllers\Api\ImageProcessorObjectClassController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\ObjectClassAliasController;
use App\Http\Controllers\Api\ObjectClassController;
use App\Http\Controllers\Api\PredictionThresholdController;
use App\Http\Controllers\Api\RawDataCollectionSettingController;
use App\Http\Middleware\ApiTokenAuth;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware(ApiTokenAuth::class)->group(function (): void {
  Route::get('/dashboard', [DashboardController::class, 'index']);

  Route::apiResource('catalog/locations', LocationController::class);
  Route::apiResource('catalog/camera-sources', CameraSourceController::class);
  Route::apiResource('catalog/image-processors', ImageProcessorController::class);
  Route::apiResource('catalog/object-classes', ObjectClassController::class);
  Route::apiResource('catalog/object-class-aliases', ObjectClassAliasController::class);
  Route::apiResource('catalog/image-processor-object-classes', ImageProcessorObjectClassController::class);
  Route::apiResource('catalog/prediction-thresholds', PredictionThresholdController::class);
  Route::apiResource('catalog/camera-source-health-logs', CameraSourceHealthLogController::class);
  Route::apiResource('catalog/raw-data-collection-settings', RawDataCollectionSettingController::class);
});
