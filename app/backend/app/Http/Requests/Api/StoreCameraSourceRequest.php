<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreCameraSourceRequest extends FormRequest
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
            'location_id' => ['required', 'integer', 'exists:locations,id'],
            'image_processor_id' => ['nullable', 'integer', 'exists:image_processors,id'],
            'source_name' => ['required', 'string', 'max:255'],
            'camera_identifier' => ['nullable', 'string', 'max:255'],
            'live_feed_url' => ['nullable', 'url', 'max:2048'],
            'camera_specification' => ['nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
