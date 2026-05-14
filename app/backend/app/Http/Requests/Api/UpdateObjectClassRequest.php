<?php

namespace App\Http\Requests\Api;

use App\Models\ObjectClass;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateObjectClassRequest extends FormRequest
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
        /** @var ObjectClass|null $objectClass */
        $objectClass = $this->route('object_class');

        return [
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('object_classes', 'slug')->ignore($objectClass?->id),
            ],
            'display_name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
