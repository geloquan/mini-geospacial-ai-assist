<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreObjectClassAliasRequest extends FormRequest
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
            'object_class_id' => ['required', 'integer', 'exists:object_classes,id'],
            'alias' => [
                'required',
                'string',
                'max:255',
                Rule::unique('object_class_aliases', 'alias')->where(
                    fn ($query) => $query->where('object_class_id', $this->input('object_class_id')),
                ),
            ],
        ];
    }
}
