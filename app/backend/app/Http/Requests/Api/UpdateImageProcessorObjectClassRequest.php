<?php

namespace App\Http\Requests\Api;

use App\Models\ImageProcessorObjectClass;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateImageProcessorObjectClassRequest extends FormRequest
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
        /** @var ImageProcessorObjectClass|null $imageProcessorObjectClass */
        $imageProcessorObjectClass = $this->route('image_processor_object_class');
        $imageProcessorId = $this->input('image_processor_id', $imageProcessorObjectClass?->image_processor_id);

        return [
            'image_processor_id' => ['sometimes', 'required', 'integer', 'exists:image_processors,id'],
            'object_class_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:object_classes,id',
                Rule::unique('image_processor_object_classes', 'object_class_id')
                    ->where(fn ($query) => $query->where('image_processor_id', $imageProcessorId))
                    ->ignore($imageProcessorObjectClass?->id),
            ],
            'is_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
