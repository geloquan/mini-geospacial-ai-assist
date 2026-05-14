<?php

namespace App\Http\Requests\Api;

use App\Models\PredictionThreshold;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePredictionThresholdRequest extends FormRequest
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
        /** @var PredictionThreshold|null $predictionThreshold */
        $predictionThreshold = $this->route('prediction_threshold');

        $cameraSourceId = $this->input('camera_source_id', $predictionThreshold?->camera_source_id);
        $imageProcessorId = $this->input('image_processor_id', $predictionThreshold?->image_processor_id);
        return [
            'camera_source_id' => ['sometimes', 'required', 'integer', 'exists:camera_sources,id'],
            'image_processor_id' => ['sometimes', 'required', 'integer', 'exists:image_processors,id'],
            'object_class_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:object_classes,id',
                Rule::unique('prediction_thresholds', 'object_class_id')->where(fn ($query) => $query
                    ->where('camera_source_id', $cameraSourceId)
                    ->where('image_processor_id', $imageProcessorId))
                    ->ignore($predictionThreshold?->id),
            ],
            'confidence_threshold' => ['sometimes', 'required', 'numeric', 'between:0,1'],
            'iou_threshold' => ['sometimes', 'required', 'numeric', 'between:0,1'],
        ];
    }
}
