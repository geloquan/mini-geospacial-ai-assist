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
    vendor?: string | null
    model?: string | null
    resolution?: string | null
    fps?: number | null
    field_of_view?: string | null
  } | null
  yolo_model_metadata: {
    model_name?: string | null
    model_version?: string | null
    confidence_threshold?: number | null
    iou_threshold?: number | null
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
  latitude: location.latitude,
  longitude: location.longitude,
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
