<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreImageProcessorRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'model_name' => ['nullable', 'string', 'max:255'],
            'model_version' => ['nullable', 'string', 'max:255'],
            'model_path' => ['nullable', 'string', 'max:2048'],
            'model_file' => ['nullable', 'file', 'extensions:pt,onnx,engine,tflite,pb', 'max:102400'],
            'metadata' => ['nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
