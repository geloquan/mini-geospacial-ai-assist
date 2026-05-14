export type ModuleItem = {
  slug: string
  title: string
  description: string
}

export type CameraLocation = {
  id: number
  locationName: string
  descriptiveLocation: string
  cameraIdentifier: string | null
  liveFeedUrl: string | null
  cameraSpecification: {
    vendor: string | null
    model: string | null
    resolution: string | null
    fps: number | null
    fieldOfView: string | null
  } | null
  yoloModelMetadata: {
    modelName: string | null
    modelVersion: string | null
    confidenceThreshold: number | null
    iouThreshold: number | null
  } | null
  latitude: number | null
  longitude: number | null
}

export type CreateCameraLocationInput = {
  locationName: string
  descriptiveLocation: string
  cameraIdentifier: string | null
  liveFeedUrl: string | null
  cameraSpecification: {
    vendor: string | null
    model: string | null
    resolution: string | null
    fps: number | null
    fieldOfView: string | null
  } | null
  yoloModelMetadata: {
    modelName: string | null
    modelVersion: string | null
    confidenceThreshold: number | null
    iouThreshold: number | null
  } | null
  latitude: number | null
  longitude: number | null
}
