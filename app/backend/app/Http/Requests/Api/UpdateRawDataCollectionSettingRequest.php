<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRawDataCollectionSettingRequest extends FormRequest
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
            'camera_source_id' => ['sometimes', 'required', 'integer', 'exists:camera_sources,id'],
            'storage_destination' => ['sometimes', 'required', 'string', 'max:255'],
            'max_storage_size_mb' => ['sometimes', 'required', 'integer', 'min:1'],
            'max_image_count' => ['sometimes', 'required', 'integer', 'min:1'],
            'lifecycle_strategy' => ['sometimes', 'required', 'string', Rule::in(['stop_on_condition', 'replace_oldest_on_condition'])],
            'frame_sampling_interval_value' => ['sometimes', 'required', 'integer', 'min:1'],
            'frame_sampling_interval_unit' => ['sometimes', 'required', 'string', Rule::in(['frames', 'seconds'])],
            'session_group_id' => ['sometimes', 'required', 'string', 'max:255'],
            'collection_context_notes' => ['sometimes', 'nullable', 'string'],
            'collection_type' => ['sometimes', 'required', 'string', Rule::in(['schedule', 'immediate', 'on_command'])],
        ];
    }
}
