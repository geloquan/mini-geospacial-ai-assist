<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateImageProcessorRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'model_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'model_version' => ['sometimes', 'nullable', 'string', 'max:255'],
            'model_path' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'model_file' => ['sometimes', 'nullable', 'file', 'extensions:pt,onnx,engine,tflite,pb', 'max:102400'],
            'metadata' => ['sometimes', 'nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
