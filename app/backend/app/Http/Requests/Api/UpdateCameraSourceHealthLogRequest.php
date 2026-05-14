<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCameraSourceHealthLogRequest extends FormRequest
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
            'camera_source_id' => ['sometimes', 'required', 'integer', 'exists:camera_sources,id'],
            'status' => ['sometimes', 'required', 'string', 'max:255'],
            'delay' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'logged_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
