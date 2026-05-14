<?php

namespace App\Http\Requests\Api;

use App\Models\ObjectClassAlias;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateObjectClassAliasRequest extends FormRequest
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
        /** @var ObjectClassAlias|null $objectClassAlias */
        $objectClassAlias = $this->route('object_class_alias');
        $objectClassId = $this->input('object_class_id', $objectClassAlias?->object_class_id);

        return [
            'object_class_id' => ['sometimes', 'required', 'integer', 'exists:object_classes,id'],
            'alias' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('object_class_aliases', 'alias')
                    ->where(fn ($query) => $query->where('object_class_id', $objectClassId))
                    ->ignore($objectClassAlias?->id),
            ],
        ];
    }
}
