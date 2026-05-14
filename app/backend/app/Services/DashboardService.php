<?php

namespace App\Services;

use App\Models\CameraLocation;
use App\Models\User;

class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function payloadFor(User $user): array
    {
        return [
            'modules' => [
                [
                    'slug' => 'live-feed-configuration',
                    'title' => 'Live Feed Configuration',
                    'description' => 'Connect and maintain camera channels for real-time ingestion.',
                ],
                [
                    'slug' => 'camera-specification',
                    'title' => 'Camera Specification',
                    'description' => 'Track camera hardware specs, coverage, and operational details.',
                ],
                [
                    'slug' => 'yolo-model-metadata',
                    'title' => 'YOLO Model Metadata',
                    'description' => 'Store model versioning and thresholds for inference quality.',
                ],
                [
                    'slug' => 'camera-placement-locations',
                    'title' => 'Camera Placement Locations',
                    'description' => 'Manage descriptive geospatial placement records for each camera.',
                ],
            ],
            'summary' => [
                'username' => $user->name,
                'location_count' => CameraLocation::query()->count(),
            ],
        ];
    }
}
