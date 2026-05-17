<?php

namespace App\Jobs;

use App\Services\RawDataCollectionFrameCaptureService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CollectRawDataFramesJob implements ShouldQueue
{
  use Queueable;

  public int $timeout = 660;
  private int $windowSeconds;

  public function __construct(int $windowSeconds = 600)
  {
    $this->windowSeconds = max(1, $windowSeconds);
    $this->timeout = $this->windowSeconds + 60;
    $this->onQueue('raw-data-collection');
  }

  public function handle(RawDataCollectionFrameCaptureService $frameCaptureService): void
  {
    $capturedCount = $frameCaptureService->captureScheduledWindow($this->windowSeconds);

    Log::info('Completed scheduled raw data frame collection job.', [
      'window_seconds' => $this->windowSeconds,
      'captured_count' => $capturedCount,
    ]);
  }
}
