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

Artisan::command('raw-data-collection:capture-frames-forever {--sleep=5}', function (
    RawDataCollectionFrameCaptureService $frameCaptureService
): int {
    $sleepSeconds = max(1, (int) $this->option('sleep'));
    $this->info("Starting forever frame capture loop (sleep: {$sleepSeconds}s). Press Ctrl+C to stop.");

    while (true) {
        $capturedCount = $frameCaptureService->captureScheduled();
        $this->line(now()->toDateTimeString() . " Captured {$capturedCount} frame(s).");
        sleep($sleepSeconds);
    }
})->purpose('Continuously capture image frames without requiring schedule:run.');

Schedule::command('raw-data-collection:capture-frames')
    ->withoutOverlapping(1)
    ->everySecond();
