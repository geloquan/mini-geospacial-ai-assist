<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCameraSourceRequest extends FormRequest
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
            'location_id' => ['sometimes', 'required', 'integer', 'exists:locations,id'],
            'image_processor_id' => ['sometimes', 'nullable', 'integer', 'exists:image_processors,id'],
            'source_name' => ['sometimes', 'required', 'string', 'max:255'],
            'camera_identifier' => ['sometimes', 'nullable', 'string', 'max:255'],
            'live_feed_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'camera_specification' => ['sometimes', 'nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
