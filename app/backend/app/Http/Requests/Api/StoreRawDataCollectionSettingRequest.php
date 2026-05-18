<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreRawDataCollectionSettingRequest extends FormRequest
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
            'max_storage_size_mb' => ['required', 'integer', 'min:1'],
            'max_image_count' => ['required', 'integer', 'min:1'],
            'lifecycle_strategy' => ['required', 'string', Rule::in(['stop_on_condition', 'replace_oldest_on_condition'])],
            'frame_sampling_interval_value' => ['required', 'integer', 'min:1'],
            'frame_sampling_interval_unit' => ['required', 'string', Rule::in(['frames', 'seconds'])],
            'collection_context_notes' => ['nullable', 'string'],
            'collection_type' => ['required', 'string', Rule::in([
                'scheduled_capture',
                'event_triggered_capture',
                'manual_capture',
            ])],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $collectionType = $this->input('collection_type');
            $frameSamplingIntervalUnit = $this->input('frame_sampling_interval_unit');
            $frameSamplingIntervalValue = (int) $this->input('frame_sampling_interval_value');

            if (
                $collectionType === 'scheduled_capture'
                && $frameSamplingIntervalUnit === 'frames'
                && $frameSamplingIntervalValue === 1
            ) {
                $validator->errors()->add(
                    'frame_sampling_interval_unit',
                    'Use frame_sampling_interval_unit=seconds and frame_sampling_interval_value=1 for 1 FPS scheduled capture.'
                );
            }
        });
    }
}
