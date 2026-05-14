<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreCameraSourceHealthLogRequest extends FormRequest
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
            'camera_source_id' => ['required', 'integer', 'exists:camera_sources,id'],
            'status' => ['required', 'string', 'max:255'],
            'delay' => ['nullable', 'integer', 'min:0'],
            'logged_at' => ['nullable', 'date'],
        ];
    }
}
