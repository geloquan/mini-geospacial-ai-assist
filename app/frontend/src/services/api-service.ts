import type {
  CameraLocation,
  CreateCameraLocationInput,
  ModuleItem,
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

type ApiCameraLocation = {
  id: number
  location_name: string
  descriptive_location: string
  camera_identifier: string | null
  live_feed_url: string | null
  camera_specification: {
    vendor: string | null
    model: string | null
    resolution: string | null
    fps: number | null
    field_of_view: string | null
  } | null
  yolo_model_metadata: {
    model_name: string | null
    model_version: string | null
    confidence_threshold: number | null
    iou_threshold: number | null
  } | null
  latitude: number | string | null
  longitude: number | string | null
}

type LocationsApiResponse = {
  data: ApiCameraLocation[]
}

type StoreLocationApiResponse = {
  data: ApiCameraLocation
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

export type CreateImageProcessorInput = {
  name: string
  modelName: string
  modelVersion: string
  isActive: boolean
}

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

const mapCameraLocation = (location: ApiCameraLocation): CameraLocation => ({
  id: location.id,
  locationName: location.location_name,
  descriptiveLocation: location.descriptive_location,
  cameraIdentifier: location.camera_identifier,
  liveFeedUrl: location.live_feed_url,
  cameraSpecification:
    location.camera_specification === null
      ? null
      : {
          vendor: location.camera_specification.vendor ?? null,
          model: location.camera_specification.model ?? null,
          resolution: location.camera_specification.resolution ?? null,
          fps: location.camera_specification.fps ?? null,
          fieldOfView: location.camera_specification.field_of_view ?? null,
        },
  yoloModelMetadata:
    location.yolo_model_metadata === null
      ? null
      : {
          modelName: location.yolo_model_metadata.model_name ?? null,
          modelVersion: location.yolo_model_metadata.model_version ?? null,
          confidenceThreshold: location.yolo_model_metadata.confidence_threshold ?? null,
          iouThreshold: location.yolo_model_metadata.iou_threshold ?? null,
        },
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
  locations: CameraLocation[]
}> => {
  const headers = {
    Authorization: `Bearer ${token}`,
  }

  const [dashboardPayload, locationsPayload] = await Promise.all([
    requestJson<DashboardApiResponse>('/dashboard', { headers }),
    requestJson<LocationsApiResponse>('/locations', { headers }),
  ])

  return {
    modules: dashboardPayload.data.modules,
    locationCount: dashboardPayload.data.summary.location_count,
    locations: locationsPayload.data.map(mapCameraLocation),
  }
}

export const createLocation = async (
  token: string,
  input: CreateCameraLocationInput,
): Promise<CameraLocation> => {
  const payload = await requestJson<StoreLocationApiResponse>('/locations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      location_name: input.locationName,
      descriptive_location: input.descriptiveLocation,
      camera_identifier: input.cameraIdentifier,
      live_feed_url: input.liveFeedUrl,
      camera_specification:
        input.cameraSpecification === null
          ? null
          : {
              vendor: input.cameraSpecification.vendor,
              model: input.cameraSpecification.model,
              resolution: input.cameraSpecification.resolution,
              fps: input.cameraSpecification.fps,
              field_of_view: input.cameraSpecification.fieldOfView,
            },
      yolo_model_metadata:
        input.yoloModelMetadata === null
          ? null
          : {
              model_name: input.yoloModelMetadata.modelName,
              model_version: input.yoloModelMetadata.modelVersion,
              confidence_threshold: input.yoloModelMetadata.confidenceThreshold,
              iou_threshold: input.yoloModelMetadata.iouThreshold,
            },
      latitude: input.latitude,
      longitude: input.longitude,
    }),
  })

  return mapCameraLocation(payload.data)
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
