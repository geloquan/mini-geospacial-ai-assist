<?php

namespace App\Services;

use App\Models\CameraSource;
use App\Models\RawDataCollectionSetting;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use JsonException;
use RuntimeException;

class RawDataCollectionSettingService
{
    public function listPaginated(int $perPage): LengthAwarePaginator
    {
        return RawDataCollectionSetting::query()->latest()->paginate($perPage);
    }

    public function findById(int $id): RawDataCollectionSetting
    {
        return RawDataCollectionSetting::query()->findOrFail($id);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): RawDataCollectionSetting
    {
        $rawDataCollectionSetting = RawDataCollectionSetting::query()->create($data);

        return $this->syncStorageDestinationAndMetadata($rawDataCollectionSetting);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(RawDataCollectionSetting $rawDataCollectionSetting, array $data): RawDataCollectionSetting
    {
        $rawDataCollectionSetting->fill($data);
        $rawDataCollectionSetting->save();

        return $this->syncStorageDestinationAndMetadata($rawDataCollectionSetting);
    }

    public function delete(RawDataCollectionSetting $rawDataCollectionSetting): void
    {
        $rawDataCollectionSetting->delete();
    }

    /**
     * @return array<string, mixed>
     */
    public function buildGalleryPayload(RawDataCollectionSetting $rawDataCollectionSetting): array
    {
        $rawDataCollectionSetting->loadMissing('cameraSource.location');

        $cameraSource = $rawDataCollectionSetting->cameraSource;
        if (!$cameraSource instanceof CameraSource) {
            throw new RuntimeException('Unable to load gallery metadata without a valid camera source.');
        }

        $metadata = $this->buildMetadataPayload($rawDataCollectionSetting, $cameraSource);
        $storageDestination = Arr::get($metadata, 'raw_data_collection_setting.storage_destination');
        if (!is_string($storageDestination)) {
            throw new RuntimeException('Storage destination for raw data collection is invalid.');
        }

        $imagePaths = collect(Storage::disk('local')->allFiles($storageDestination))
            ->filter(static function (string $path): bool {
                $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

                return in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff'], true);
            })
            ->values()
            ->all();

        return [
            'raw_data_collection_setting' => Arr::get($metadata, 'raw_data_collection_setting'),
            'camera_source' => Arr::get($metadata, 'camera_source'),
            'location' => Arr::get($metadata, 'location'),
            'gallery' => [
                'storage_destination' => $storageDestination,
                'image_paths' => $imagePaths,
            ],
        ];
    }

    private function syncStorageDestinationAndMetadata(
        RawDataCollectionSetting $rawDataCollectionSetting
    ): RawDataCollectionSetting {
        $rawDataCollectionSetting->loadMissing('cameraSource.location');

        $cameraSource = $rawDataCollectionSetting->cameraSource;
        if (!$cameraSource instanceof CameraSource) {
            throw new RuntimeException('Unable to generate metadata without a valid camera source.');
        }

        $storageDestination = sprintf(
            'raw-data-collections/camera-%d/raw-data-collection-%d',
            $cameraSource->id,
            $rawDataCollectionSetting->id
        );
        $metadataPath = $storageDestination.'/metadata.json';

        $rawDataCollectionSetting->storage_destination = $storageDestination;
        $rawDataCollectionSetting->save();

        try {
            $encodedMetadata = json_encode(
                $this->buildMetadataPayload($rawDataCollectionSetting, $cameraSource),
                JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            );
        } catch (JsonException $exception) {
            throw new RuntimeException('Failed to encode raw data collection metadata.', 0, $exception);
        }

        if (!Storage::disk('local')->put($metadataPath, $encodedMetadata)) {
            throw new RuntimeException('Failed to write raw data collection metadata file.');
        }

        return $rawDataCollectionSetting;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildMetadataPayload(
        RawDataCollectionSetting $rawDataCollectionSetting,
        CameraSource $cameraSource
    ): array {
        $location = $cameraSource->location;

        return [
            'raw_data_collection_setting' => [
                'id' => $rawDataCollectionSetting->id,
                'camera_source_id' => $rawDataCollectionSetting->camera_source_id,
                'storage_destination' => $rawDataCollectionSetting->storage_destination,
                'max_storage_size_mb' => $rawDataCollectionSetting->max_storage_size_mb,
                'max_image_count' => $rawDataCollectionSetting->max_image_count,
                'lifecycle_strategy' => $rawDataCollectionSetting->lifecycle_strategy,
                'frame_sampling_interval_value' => $rawDataCollectionSetting->frame_sampling_interval_value,
                'frame_sampling_interval_unit' => $rawDataCollectionSetting->frame_sampling_interval_unit,
                'collection_context_notes' => $rawDataCollectionSetting->collection_context_notes,
                'collection_type' => $rawDataCollectionSetting->collection_type,
                'created_at' => $rawDataCollectionSetting->created_at?->toIso8601String(),
                'updated_at' => $rawDataCollectionSetting->updated_at?->toIso8601String(),
            ],
            'camera_source' => [
                'id' => $cameraSource->id,
                'location_id' => $cameraSource->location_id,
                'image_processor_id' => $cameraSource->image_processor_id,
                'source_name' => $cameraSource->source_name,
                'camera_identifier' => $cameraSource->camera_identifier,
                'live_feed_url' => $cameraSource->live_feed_url,
                'camera_specification' => $cameraSource->camera_specification,
                'is_active' => $cameraSource->is_active,
                'created_at' => $cameraSource->created_at?->toIso8601String(),
                'updated_at' => $cameraSource->updated_at?->toIso8601String(),
            ],
            'location' => $location === null
                ? null
                : [
                    'id' => $location->id,
                    'location_name' => $location->location_name,
                    'descriptive_location' => $location->descriptive_location,
                    'image_paths' => $location->image_paths,
                    'latitude' => $location->latitude,
                    'longitude' => $location->longitude,
                    'created_at' => $location->created_at?->toIso8601String(),
                    'updated_at' => $location->updated_at?->toIso8601String(),
                ],
        ];
    }
}
