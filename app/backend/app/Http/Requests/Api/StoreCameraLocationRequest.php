<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreCameraLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'location_name' => ['required', 'string', 'max:255'],
            'descriptive_location' => ['required', 'string', 'max:1000'],
            'camera_identifier' => ['nullable', 'string', 'max:255'],
            'live_feed_url' => ['nullable', 'url', 'max:2048'],
            'camera_specification' => ['nullable', 'array'],
            'camera_specification.vendor' => ['nullable', 'string', 'max:255'],
            'camera_specification.model' => ['nullable', 'string', 'max:255'],
            'camera_specification.resolution' => ['nullable', 'string', 'max:255'],
            'camera_specification.fps' => ['nullable', 'integer', 'min:1', 'max:240'],
            'camera_specification.field_of_view' => ['nullable', 'string', 'max:255'],
            'yolo_model_metadata' => ['nullable', 'array'],
            'yolo_model_metadata.model_name' => ['nullable', 'string', 'max:255'],
            'yolo_model_metadata.model_version' => ['nullable', 'string', 'max:255'],
            'yolo_model_metadata.confidence_threshold' => ['nullable', 'numeric', 'between:0,1'],
            'yolo_model_metadata.iou_threshold' => ['nullable', 'numeric', 'between:0,1'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
