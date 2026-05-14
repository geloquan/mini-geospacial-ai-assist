<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CameraSourceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'location_id' => $this->location_id,
            'image_processor_id' => $this->image_processor_id,
            'source_name' => $this->source_name,
            'camera_identifier' => $this->camera_identifier,
            'live_feed_url' => $this->live_feed_url,
            'camera_specification' => $this->camera_specification,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
