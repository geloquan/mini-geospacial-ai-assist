<?php

namespace App\Services;

use App\Models\CameraSource;
use App\Models\RawDataCollectionSetting;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use JsonException;
use RuntimeException;
use Throwable;

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
  public function buildGalleryPayload(
    RawDataCollectionSetting $rawDataCollectionSetting,
    int                      $page = 1,
    int                      $perPage = 12,
    ?string                  $fromDateTime = null,
    ?string                  $toDateTime = null,
  ): array
  {
    $rawDataCollectionSetting->loadMissing('cameraSource.location', 'cameraSource.latestHealthLog');

    $cameraSource = $rawDataCollectionSetting->cameraSource;
    if (!$cameraSource instanceof CameraSource) {
      throw new RuntimeException('Unable to load gallery metadata without a valid camera source.');
    }

    $metadata = $this->buildMetadataPayload($rawDataCollectionSetting, $cameraSource);
    $storageDestination = Arr::get($metadata, 'raw_data_collection_setting.storage_destination');
    if (!is_string($storageDestination)) {
      throw new RuntimeException('Storage destination for raw data collection is invalid.');
    }

    $frameItems = collect(Storage::disk('local')->allFiles($storageDestination))
      ->filter(static function (string $path): bool {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff'], true);
      })
      ->map(fn (string $path): ?array => $this->buildGalleryFramePayload($path))
      ->filter(static fn (?array $frame): bool => $frame !== null)
      ->sortByDesc('captured_at_timestamp')
      ->values()
      ->all();

    $parsedFromDateTime = $this->parseDateTimeFilter($fromDateTime);
    $parsedToDateTime = $this->parseDateTimeFilter($toDateTime);

    $filteredFrameItems = collect($frameItems)
      ->filter(function (array $frameItem) use ($parsedFromDateTime, $parsedToDateTime): bool {
        $capturedAtTimestamp = Arr::get($frameItem, 'captured_at_timestamp');
        if (!is_int($capturedAtTimestamp)) {
          return false;
        }

        if ($parsedFromDateTime !== null && $capturedAtTimestamp < $parsedFromDateTime->getTimestamp()) {
          return false;
        }

        if ($parsedToDateTime !== null && $capturedAtTimestamp > $parsedToDateTime->getTimestamp()) {
          return false;
        }

        return true;
      })
      ->values();

    $normalizedPerPage = max(1, min($perPage, 100));
    $total = $filteredFrameItems->count();
    $lastPage = max(1, (int)ceil($total / $normalizedPerPage));
    $currentPage = max(1, min($page, $lastPage));
    $paginatedFrameItems = $filteredFrameItems->forPage($currentPage, $normalizedPerPage)->values();
    $imagePaths = $paginatedFrameItems
      ->pluck('path')
      ->filter(static fn (mixed $path): bool => is_string($path))
      ->all();

    return [
      'raw_data_collection_setting' => Arr::get($metadata, 'raw_data_collection_setting'),
      'camera_source' => Arr::get($metadata, 'camera_source'),
      'location' => Arr::get($metadata, 'location'),
      'gallery' => [
        'storage_destination' => $storageDestination,
        'image_paths' => $imagePaths,
        'frames' => $paginatedFrameItems->map(function (array $frameItem): array {
          unset($frameItem['captured_at_timestamp']);

          return $frameItem;
        })->all(),
        'pagination' => [
          'current_page' => $currentPage,
          'last_page' => $lastPage,
          'per_page' => $normalizedPerPage,
          'total' => $total,
        ],
        'filters' => [
          'from_datetime' => $parsedFromDateTime?->toIso8601String(),
          'to_datetime' => $parsedToDateTime?->toIso8601String(),
        ],
      ],
    ];
  }

  public function resolveGalleryImageAbsolutePath(string $relativePath): ?string
  {
    $normalizedRelativePath = trim(str_replace('\\', '/', $relativePath), '/');
    if ($normalizedRelativePath === '' || str_contains($normalizedRelativePath, '..')) {
      return null;
    }

    if (!str_starts_with($normalizedRelativePath, 'raw-data-collections/')) {
      return null;
    }

    if (preg_match('/^[-A-Za-z0-9._\/]+$/', $normalizedRelativePath) !== 1) {
      return null;
    }

    if (!Storage::disk('local')->exists($normalizedRelativePath)) {
      return null;
    }

    $absolutePath = Storage::disk('local')->path($normalizedRelativePath);
    $mimeType = mime_content_type($absolutePath);
    if (!is_string($mimeType) || !str_starts_with($mimeType, 'image/')) {
      return null;
    }

    return $absolutePath;
  }

  private function syncStorageDestinationAndMetadata(
    RawDataCollectionSetting $rawDataCollectionSetting
  ): RawDataCollectionSetting
  {
    $rawDataCollectionSetting->loadMissing('cameraSource.location', 'cameraSource.latestHealthLog');

    $cameraSource = $rawDataCollectionSetting->cameraSource;
    if (!$cameraSource instanceof CameraSource) {
      throw new RuntimeException('Unable to generate metadata without a valid camera source.');
    }

    $storageDestination = sprintf(
      'raw-data-collections/camera-%d/raw-data-collection-%d',
      $cameraSource->id,
      $rawDataCollectionSetting->id
    );
    $metadataPath = $storageDestination . '/metadata.json';

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
    CameraSource             $cameraSource
  ): array
  {
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
        'collection_status' => $cameraSource->collectionStatus(),
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

  /**
   * @return array<string, mixed>|null
   */
  private function buildGalleryFramePayload(string $path): ?array
  {
    if (!Storage::disk('local')->exists($path)) {
      return null;
    }

    $absolutePath = Storage::disk('local')->path($path);
    $lastModifiedTimestamp = Storage::disk('local')->lastModified($path);
    $capturedAt = $this->resolveFrameCapturedAt($path, $lastModifiedTimestamp);
    $mimeType = mime_content_type($absolutePath);
    $imageDimensions = @getimagesize($absolutePath);

    return [
      'path' => $path,
      'file_name' => basename($path),
      'captured_at' => $capturedAt->toIso8601String(),
      'captured_at_timestamp' => $capturedAt->getTimestamp(),
      'last_modified_at' => CarbonImmutable::createFromTimestamp($lastModifiedTimestamp)->toIso8601String(),
      'mime_type' => is_string($mimeType) ? $mimeType : null,
      'file_size_bytes' => Storage::disk('local')->size($path),
      'width' => is_array($imageDimensions) ? ($imageDimensions[0] ?? null) : null,
      'height' => is_array($imageDimensions) ? ($imageDimensions[1] ?? null) : null,
    ];
  }

  private function resolveFrameCapturedAt(string $path, int $lastModifiedTimestamp): CarbonImmutable
  {
    $fileName = basename($path);
    $matches = [];
    if (preg_match('/^frame_(\d{8})_(\d{6})_(\d{1,6})_[^\/]+\.[A-Za-z0-9]+$/', $fileName, $matches) !== 1) {
      return CarbonImmutable::createFromTimestamp($lastModifiedTimestamp);
    }

    $microseconds = str_pad($matches[3], 6, '0', STR_PAD_RIGHT);
    $dateTime = CarbonImmutable::createFromFormat(
      'Ymd_His_u',
      sprintf('%s_%s_%s', $matches[1], $matches[2], $microseconds),
      config('app.timezone')
    );

    if ($dateTime === false) {
      return CarbonImmutable::createFromTimestamp($lastModifiedTimestamp);
    }

    return $dateTime;
  }

  private function parseDateTimeFilter(?string $value): ?CarbonImmutable
  {
    if (!is_string($value)) {
      return null;
    }

    $normalizedValue = trim($value);
    if ($normalizedValue === '') {
      return null;
    }

    try {
      return CarbonImmutable::parse($normalizedValue);
    } catch (Throwable) {
      return null;
    }
  }
}
