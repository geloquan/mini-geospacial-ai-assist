<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocationResource extends JsonResource
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
            'image_paths' => $this->image_paths,
            'timezone' => $this->timezone,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
