<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PredictionThresholdResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'camera_source_id' => $this->camera_source_id,
            'image_processor_id' => $this->image_processor_id,
            'object_class_id' => $this->object_class_id,
            'confidence_threshold' => $this->confidence_threshold,
            'iou_threshold' => $this->iou_threshold,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
