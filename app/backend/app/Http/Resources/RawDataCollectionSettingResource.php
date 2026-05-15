<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RawDataCollectionSettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'camera_source_id' => $this->camera_source_id,
            'storage_destination' => $this->storage_destination,
            'max_storage_size_mb' => $this->max_storage_size_mb,
            'max_image_count' => $this->max_image_count,
            'lifecycle_strategy' => $this->lifecycle_strategy,
            'frame_sampling_interval_value' => $this->frame_sampling_interval_value,
            'frame_sampling_interval_unit' => $this->frame_sampling_interval_unit,
            'session_group_id' => $this->session_group_id,
            'collection_context_notes' => $this->collection_context_notes,
            'collection_type' => $this->collection_type,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
