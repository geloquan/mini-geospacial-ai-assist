<?php

use App\Services\RawDataCollectionFrameCaptureService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('raw-data-collection:capture-frames {rawDataCollectionSetting?}', function (
    RawDataCollectionFrameCaptureService $frameCaptureService
): int {
    $rawDataCollectionSettingId = $this->argument('rawDataCollectionSetting');

    if ($rawDataCollectionSettingId !== null) {
        $captured = $frameCaptureService->captureById((int) $rawDataCollectionSettingId);
        $this->info($captured
            ? "Captured frame for raw data collection setting {$rawDataCollectionSettingId}."
            : "No frame captured for raw data collection setting {$rawDataCollectionSettingId}.");

        return 0;
    }

    $capturedCount = $frameCaptureService->captureScheduled();
    $this->info("Captured {$capturedCount} frame(s) for scheduled raw data collection settings.");

    return 0;
})->purpose('Capture image frames from camera sources using raw data collection settings.');

Schedule::command('raw-data-collection:capture-frames')
    ->everySecond()
    ->withoutOverlapping();
