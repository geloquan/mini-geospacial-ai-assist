<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreImageProcessorObjectClassRequest extends FormRequest
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
            'image_processor_id' => ['required', 'integer', 'exists:image_processors,id'],
            'object_class_id' => [
                'required',
                'integer',
                'exists:object_classes,id',
                Rule::unique('image_processor_object_classes', 'object_class_id')->where(
                    fn ($query) => $query->where('image_processor_id', $this->input('image_processor_id')),
                ),
            ],
            'is_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
