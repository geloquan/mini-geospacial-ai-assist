<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePredictionThresholdRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string|Rule>>
     */
    public function rules(): array
    {
        return [
            'camera_source_id' => ['required', 'integer', 'exists:camera_sources,id'],
            'image_processor_id' => ['required', 'integer', 'exists:image_processors,id'],
            'object_class_id' => [
                'nullable',
                'integer',
                'exists:object_classes,id',
                Rule::unique('prediction_thresholds', 'object_class_id')->where(fn ($query) => $query
                    ->where('camera_source_id', $this->input('camera_source_id'))
                    ->where('image_processor_id', $this->input('image_processor_id'))),
            ],
            'confidence_threshold' => ['required', 'numeric', 'between:0,1'],
            'iou_threshold' => ['required', 'numeric', 'between:0,1'],
        ];
    }
}
