<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLocationRequest extends FormRequest
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
            'location_name' => ['sometimes', 'required', 'string', 'max:255'],
            'descriptive_location' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'image_paths' => ['sometimes', 'nullable', 'array'],
            'image_paths.*' => ['string', 'max:2048'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
