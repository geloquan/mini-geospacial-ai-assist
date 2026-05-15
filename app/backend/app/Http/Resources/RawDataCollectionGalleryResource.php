<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RawDataCollectionGalleryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'raw_data_collection_setting' => $this['raw_data_collection_setting'],
            'camera_source' => $this['camera_source'],
            'location' => $this['location'],
            'gallery' => [
                'storage_destination' => $this['gallery']['storage_destination'],
                'image_paths' => $this['gallery']['image_paths'],
            ],
        ];
    }
}
