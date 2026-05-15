import type {
  CreateLocationInput,
  ModuleItem,
  Location,
  UpdateLocationInput,
} from '../types/geospatial'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

type LoginApiResponse = {
  data: {
    token: string
    user: {
      id: number
      username: string
      email: string
    }
  }
}

type DashboardApiResponse = {
  data: {
    modules: ModuleItem[]
    summary: {
      username: string
      location_count: number
    }
  }
}

type ApiLocation = {
  id: number
  location_name: string
  descriptive_location: string | null
  image_paths: string[] | null
  latitude: number | string | null
  longitude: number | string | null
}

type StoreLocationApiResponse = {
  data: ApiLocation
}

type ApiImageProcessor = {
  id: number
  name: string
  model_name: string | null
  model_version: string | null
  model_path: string | null
  created_at: string
}

type StoreImageProcessorApiResponse = {
  data: ApiImageProcessor
}

export type UploadedImageProcessor = {
  id: number
  fileName: string
  extension: string
  sizeBytes: number
  uploadedAt: string
  modelPath: string | null
}

export type CreateCameraSourceInput = {
  locationId: number
  imageProcessorId: number | null
  sourceName: string
  cameraIdentifier: string | null
  liveFeedUrl: string | null
  cameraSpecification: {
    vendor: string | null
    model: string | null
    resolution: string | null
    fps: number | null
    fieldOfView: string | null
  }
  isActive: boolean
}

export type UpdateCameraSourceInput = Partial<CreateCameraSourceInput>

export type CreateImageProcessorInput = {
  name: string
  modelName: string
  modelVersion: string
  isActive: boolean
}

export type UpdateImageProcessorInput = Partial<CreateImageProcessorInput>

export type CreateRawDataCollectionSettingInput = {
  cameraSourceId: number
  storageDestination: string
  maxStorageSizeMb: number
  maxImageCount: number
  lifecycleStrategy: 'stop_on_condition' | 'replace_oldest_on_condition'
  frameSamplingIntervalValue: number
  frameSamplingIntervalUnit: 'frames' | 'seconds'
  sessionGroupId: string
  collectionContextNotes: string | null
  collectionType: 'schedule' | 'immediate' | 'on_command'
}

export type UpdateRawDataCollectionSettingInput = Partial<CreateRawDataCollectionSettingInput>

type StoreCameraSourceApiResponse = {
  data: {
    id: number
  }
}

export type CatalogResourceEndpoint =
  | 'catalog/locations'
  | 'catalog/camera-sources'
  | 'catalog/image-processors'
  | 'catalog/object-classes'
  | 'catalog/object-class-aliases'
  | 'catalog/image-processor-object-classes'
  | 'catalog/prediction-thresholds'
  | 'catalog/camera-source-health-logs'
  | 'catalog/raw-data-collection-settings'

type CatalogApiResponse = {
  data: Record<string, unknown>[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export type CatalogTablePayload = {
  rows: Record<string, unknown>[]
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

const toNullableNumber = (value: number | string | null): number | null => {
  if (value === null) {
    return null
  }

  const parsed = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(parsed) ? parsed : null
}

const mapLocation = (location: ApiLocation): Location => ({
  id: location.id,
  locationName: location.location_name,
  descriptiveLocation: location.descriptive_location ?? '',
  imagePaths: Array.isArray(location.image_paths) ? location.image_paths : [],
  latitude: toNullableNumber(location.latitude),
  longitude: toNullableNumber(location.longitude),
})

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string }
    return payload.message ?? 'Request failed.'
  } catch {
    return 'Request failed.'
  }
}

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, init)

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  return (await response.json()) as T
}

export const login = async (username: string, password: string): Promise<string> => {
  const payload = await requestJson<LoginApiResponse>('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  return payload.data.token
}

export const loadDashboardData = async (token: string): Promise<{
  modules: ModuleItem[]
  locationCount: number
}> => {
  const dashboardPayload = await requestJson<DashboardApiResponse>('/dashboard', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return {
    modules: dashboardPayload.data.modules,
    locationCount: dashboardPayload.data.summary.location_count,
  }
}

export const createLocation = async (
  token: string,
  input: CreateLocationInput,
): Promise<Location> => {
  const payload = await requestJson<StoreLocationApiResponse>('/catalog/locations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      location_name: input.locationName,
      descriptive_location: input.descriptiveLocation,
      image_paths: input.imagePaths,
      latitude: input.latitude,
      longitude: input.longitude,
    }),
  })

  return mapLocation(payload.data)
}

export const updateLocation = async (
  token: string,
  locationId: number,
  input: UpdateLocationInput,
): Promise<Location> => {
  const payload = await requestJson<StoreLocationApiResponse>(`/catalog/locations/${locationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...(input.locationName !== undefined ? { location_name: input.locationName } : {}),
      ...(input.descriptiveLocation !== undefined
        ? { descriptive_location: input.descriptiveLocation }
        : {}),
      ...(input.imagePaths !== undefined ? { image_paths: input.imagePaths } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
    }),
  })

  return mapLocation(payload.data)
}

export const createCameraSource = async (
  token: string,
  input: CreateCameraSourceInput,
): Promise<number> => {
  const payload = await requestJson<StoreCameraSourceApiResponse>('/catalog/camera-sources', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      location_id: input.locationId,
      image_processor_id: input.imageProcessorId,
      source_name: input.sourceName,
      camera_identifier: input.cameraIdentifier,
      live_feed_url: input.liveFeedUrl,
      camera_specification: {
        vendor: input.cameraSpecification.vendor,
        model: input.cameraSpecification.model,
        resolution: input.cameraSpecification.resolution,
        fps: input.cameraSpecification.fps,
        field_of_view: input.cameraSpecification.fieldOfView,
      },
      is_active: input.isActive,
    }),
  })

  return payload.data.id
}

export const updateCameraSource = async (
  token: string,
  cameraSourceId: number,
  input: UpdateCameraSourceInput,
): Promise<number> => {
  const payload = await requestJson<StoreCameraSourceApiResponse>(`/catalog/camera-sources/${cameraSourceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...(input.locationId !== undefined ? { location_id: input.locationId } : {}),
      ...(input.imageProcessorId !== undefined ? { image_processor_id: input.imageProcessorId } : {}),
      ...(input.sourceName !== undefined ? { source_name: input.sourceName } : {}),
      ...(input.cameraIdentifier !== undefined ? { camera_identifier: input.cameraIdentifier } : {}),
      ...(input.liveFeedUrl !== undefined ? { live_feed_url: input.liveFeedUrl } : {}),
      ...(input.cameraSpecification !== undefined
        ? {
            camera_specification: {
              vendor: input.cameraSpecification.vendor,
              model: input.cameraSpecification.model,
              resolution: input.cameraSpecification.resolution,
              fps: input.cameraSpecification.fps,
              field_of_view: input.cameraSpecification.fieldOfView,
            },
          }
        : {}),
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    }),
  })

  return payload.data.id
}

export const createRawDataCollectionSetting = async (
  token: string,
  input: CreateRawDataCollectionSettingInput,
): Promise<number> => {
  const payload = await requestJson<StoreCameraSourceApiResponse>('/catalog/raw-data-collection-settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      camera_source_id: input.cameraSourceId,
      storage_destination: input.storageDestination,
      max_storage_size_mb: input.maxStorageSizeMb,
      max_image_count: input.maxImageCount,
      lifecycle_strategy: input.lifecycleStrategy,
      frame_sampling_interval_value: input.frameSamplingIntervalValue,
      frame_sampling_interval_unit: input.frameSamplingIntervalUnit,
      session_group_id: input.sessionGroupId,
      collection_context_notes: input.collectionContextNotes,
      collection_type: input.collectionType,
    }),
  })

  return payload.data.id
}

export const updateRawDataCollectionSetting = async (
  token: string,
  rawDataCollectionSettingId: number,
  input: UpdateRawDataCollectionSettingInput,
): Promise<number> => {
  const payload = await requestJson<StoreCameraSourceApiResponse>(
    `/catalog/raw-data-collection-settings/${rawDataCollectionSettingId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...(input.cameraSourceId !== undefined ? { camera_source_id: input.cameraSourceId } : {}),
        ...(input.storageDestination !== undefined ? { storage_destination: input.storageDestination } : {}),
        ...(input.maxStorageSizeMb !== undefined ? { max_storage_size_mb: input.maxStorageSizeMb } : {}),
        ...(input.maxImageCount !== undefined ? { max_image_count: input.maxImageCount } : {}),
        ...(input.lifecycleStrategy !== undefined ? { lifecycle_strategy: input.lifecycleStrategy } : {}),
        ...(input.frameSamplingIntervalValue !== undefined
          ? { frame_sampling_interval_value: input.frameSamplingIntervalValue }
          : {}),
        ...(input.frameSamplingIntervalUnit !== undefined
          ? { frame_sampling_interval_unit: input.frameSamplingIntervalUnit }
          : {}),
        ...(input.sessionGroupId !== undefined ? { session_group_id: input.sessionGroupId } : {}),
        ...(input.collectionContextNotes !== undefined
          ? { collection_context_notes: input.collectionContextNotes }
          : {}),
        ...(input.collectionType !== undefined ? { collection_type: input.collectionType } : {}),
      }),
    },
  )

  return payload.data.id
}

export const uploadImageProcessorModel = async (
  token: string,
  file: File,
  input: CreateImageProcessorInput,
): Promise<UploadedImageProcessor> => {
  const extensionIndex = file.name.lastIndexOf('.')
  const extension = extensionIndex >= 0 ? file.name.slice(extensionIndex).toLowerCase() : ''
  const formData = new FormData()
  formData.append('name', input.name)
  formData.append('model_name', input.modelName)
  formData.append('model_version', input.modelVersion)
  formData.append('is_active', input.isActive ? '1' : '0')
  formData.append('model_file', file)

  const response = await fetch(`${API_BASE}/catalog/image-processors`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  const payload = (await response.json()) as StoreImageProcessorApiResponse

  return {
    id: payload.data.id,
    fileName: payload.data.name,
    extension,
    sizeBytes: file.size,
    uploadedAt: payload.data.created_at,
    modelPath: payload.data.model_path,
  }
}

export const updateImageProcessor = async (
  token: string,
  imageProcessorId: number,
  input: UpdateImageProcessorInput,
  file: File | null,
): Promise<UploadedImageProcessor> => {
  const formData = new FormData()

  if (input.name !== undefined) {
    formData.append('name', input.name)
  }
  if (input.modelName !== undefined) {
    formData.append('model_name', input.modelName)
  }
  if (input.modelVersion !== undefined) {
    formData.append('model_version', input.modelVersion)
  }
  if (input.isActive !== undefined) {
    formData.append('is_active', input.isActive ? '1' : '0')
  }
  if (file !== null) {
    formData.append('model_file', file)
  }
  formData.append('_method', 'PUT')

  const response = await fetch(`${API_BASE}/catalog/image-processors/${imageProcessorId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  const payload = (await response.json()) as StoreImageProcessorApiResponse
  const extension = file === null ? '' : (() => {
    const extensionIndex = file.name.lastIndexOf('.')
    return extensionIndex >= 0 ? file.name.slice(extensionIndex).toLowerCase() : ''
  })()
  const sizeBytes = file === null ? 0 : file.size

  return {
    id: payload.data.id,
    fileName: payload.data.name,
    extension,
    sizeBytes,
    uploadedAt: payload.data.created_at,
    modelPath: payload.data.model_path,
  }
}

export const loadCatalogTable = async (
  token: string,
  endpoint: CatalogResourceEndpoint,
  page: number,
  perPage = 10,
): Promise<CatalogTablePayload> => {
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })

  const payload = await requestJson<CatalogApiResponse>(`/${endpoint}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return {
    rows: payload.data,
    currentPage: payload.meta.current_page,
    lastPage: payload.meta.last_page,
    perPage: payload.meta.per_page,
    total: payload.meta.total,
  }
}
