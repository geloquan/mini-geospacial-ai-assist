<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CameraLocationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'location_name' => $this->location_name,
            'descriptive_location' => $this->descriptive_location,
            'camera_identifier' => $this->camera_identifier,
            'live_feed_url' => $this->live_feed_url,
            'camera_specification' => $this->camera_specification,
            'yolo_model_metadata' => $this->yolo_model_metadata,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
