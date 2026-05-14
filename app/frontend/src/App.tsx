import { useEffect, useMemo, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import './App.css'
import {
  createLocation,
  loadDashboardData,
  login,
} from './services/api-service'
import type { CameraLocation, ModuleItem } from './types/geospatial'

type CameraBinding = {
  id: string
  name: string
  liveFeedUrl: string
  yoloModelName: string
  yoloModelVersion: string
  locationId: number | null
}

type PredictionItem = {
  id: string
  timestamp: string
  cameraId: string
  locationId: number | null
  objectClass: string
  confidence: number
}

type ObjectClassItem = {
  id: string
  name: string
}

type AliasGroup = {
  id: string
  alias: string
  canonicalClass: string
  context: string
}

type UploadedYoloModel = {
  id: string
  fileName: string
  extension: string
  sizeBytes: number
  uploadedAt: string
}

const TOKEN_KEY = 'mini_geospatial_auth_token'
const CAMERAS_KEY = 'mini_geospatial_cameras'
const PREDICTIONS_KEY = 'mini_geospatial_predictions'
const OBJECT_CLASSES_KEY = 'mini_geospatial_object_classes'
const ALIAS_GROUPS_KEY = 'mini_geospatial_alias_groups'
const YOLO_UPLOADS_KEY = 'mini_geospatial_yolo_uploads'
const MAX_MODEL_SIZE_BYTES = 100 * 1024 * 1024
const ALLOWED_MODEL_EXTENSIONS = ['.pt', '.onnx', '.engine', '.tflite', '.pb']

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)

    if (raw === null) {
      return fallback
    }

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const writeStorage = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const toModelString = (value: string | number | null | undefined): string => {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return ''
}

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [loginError, setLoginError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const [modules, setModules] = useState<ModuleItem[]>([])
  const [locationCount, setLocationCount] = useState(0)
  const [locations, setLocations] = useState<CameraLocation[]>([])
  const [loadError, setLoadError] = useState('')
  const [locationFormError, setLocationFormError] = useState('')
  const [cameraFormError, setCameraFormError] = useState('')
  const [predictionFormError, setPredictionFormError] = useState('')
  const [classFormError, setClassFormError] = useState('')
  const [aliasFormError, setAliasFormError] = useState('')
  const [uploadError, setUploadError] = useState('')

  const [locationName, setLocationName] = useState('')
  const [descriptiveLocation, setDescriptiveLocation] = useState('')
  const [cameraIdentifier, setCameraIdentifier] = useState('')
  const [liveFeedUrl, setLiveFeedUrl] = useState('')
  const [cameraVendor, setCameraVendor] = useState('')
  const [cameraModel, setCameraModel] = useState('')
  const [cameraResolution, setCameraResolution] = useState('')
  const [cameraFps, setCameraFps] = useState('')
  const [cameraFov, setCameraFov] = useState('')
  const [modelName, setModelName] = useState('')
  const [modelVersion, setModelVersion] = useState('')
  const [confidenceThreshold, setConfidenceThreshold] = useState('')
  const [iouThreshold, setIouThreshold] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')

  const [cameraName, setCameraName] = useState('')
  const [cameraFeedUrl, setCameraFeedUrl] = useState('')
  const [cameraYoloModelName, setCameraYoloModelName] = useState('')
  const [cameraYoloModelVersion, setCameraYoloModelVersion] = useState('')

  const [predictionCameraId, setPredictionCameraId] = useState('')
  const [predictionObjectClass, setPredictionObjectClass] = useState('')
  const [predictionConfidence, setPredictionConfidence] = useState('0.70')

  const [className, setClassName] = useState('')
  const [aliasName, setAliasName] = useState('')
  const [aliasCanonicalClass, setAliasCanonicalClass] = useState('')
  const [aliasContext, setAliasContext] = useState('')

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)

  const [cameras, setCameras] = useState<CameraBinding[]>(() =>
    readStorage<CameraBinding[]>(CAMERAS_KEY, []),
  )
  const [predictions, setPredictions] = useState<PredictionItem[]>(() =>
    readStorage<PredictionItem[]>(PREDICTIONS_KEY, []),
  )
  const [objectClasses, setObjectClasses] = useState<ObjectClassItem[]>(() =>
    readStorage<ObjectClassItem[]>(OBJECT_CLASSES_KEY, []),
  )
  const [aliasGroups, setAliasGroups] = useState<AliasGroup[]>(() =>
    readStorage<AliasGroup[]>(ALIAS_GROUPS_KEY, []),
  )
  const [uploadedYoloModels, setUploadedYoloModels] = useState<UploadedYoloModel[]>(() =>
    readStorage<UploadedYoloModel[]>(YOLO_UPLOADS_KEY, []),
  )

  useEffect(() => {
    if (token === null) {
      return
    }

    const loadDashboard = async () => {
      try {
        const payload = await loadDashboardData(token)

        setModules(payload.modules)
        setLocationCount(payload.locationCount)
        setLocations(payload.locations)
        setCameras((current) => {
          if (current.length > 0) {
            return current
          }

          const seeded = payload.locations
            .filter((location) => location.cameraIdentifier !== null)
            .map((location) => {
              return {
                id: makeId(),
                name: location.cameraIdentifier ?? `${location.locationName} camera`,
                liveFeedUrl: location.liveFeedUrl ?? '',
                yoloModelName: toModelString(location.yoloModelMetadata?.modelName),
                yoloModelVersion: toModelString(location.yoloModelMetadata?.modelVersion),
                locationId: location.id,
              }
            })

          return seeded.length > 0 ? seeded : current
        })
        setLoadError('')
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load dashboard data.',
        )
      }
    }

    void loadDashboard()
  }, [token])

  useEffect(() => {
    writeStorage(CAMERAS_KEY, cameras)
  }, [cameras])

  useEffect(() => {
    writeStorage(PREDICTIONS_KEY, predictions)
  }, [predictions])

  useEffect(() => {
    writeStorage(OBJECT_CLASSES_KEY, objectClasses)
  }, [objectClasses])

  useEffect(() => {
    writeStorage(ALIAS_GROUPS_KEY, aliasGroups)
  }, [aliasGroups])

  useEffect(() => {
    writeStorage(YOLO_UPLOADS_KEY, uploadedYoloModels)
  }, [uploadedYoloModels])

  const effectiveSelectedLocationId = selectedLocationId ?? locations[0]?.id ?? null

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === effectiveSelectedLocationId) ?? null,
    [effectiveSelectedLocationId, locations],
  )

  const selectedLocationCameras = useMemo(
    () => cameras.filter((camera) => camera.locationId === effectiveSelectedLocationId),
    [cameras, effectiveSelectedLocationId],
  )

  const groupedAliases = useMemo(() => {
    return aliasGroups.reduce<Record<string, AliasGroup[]>>((groups, aliasGroup) => {
      if (!(aliasGroup.canonicalClass in groups)) {
        groups[aliasGroup.canonicalClass] = []
      }

      groups[aliasGroup.canonicalClass].push(aliasGroup)
      return groups
    }, {})
  }, [aliasGroups])

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsAuthenticating(true)
    setLoginError('')

    try {
      const issuedToken = await login(username, password)

      localStorage.setItem(TOKEN_KEY, issuedToken)
      setToken(issuedToken)
      setUsername('')
      setPassword('')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const onCreateLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (token === null) {
      setLocationFormError('Please login first.')
      return
    }

    try {
      const cameraSpecificationInput = {
        vendor: cameraVendor || null,
        model: cameraModel || null,
        resolution: cameraResolution || null,
        fps: cameraFps === '' ? null : Number(cameraFps),
        fieldOfView: cameraFov || null,
      }
      const yoloModelMetadataInput = {
        modelName: modelName || null,
        modelVersion: modelVersion || null,
        confidenceThreshold: confidenceThreshold === '' ? null : Number(confidenceThreshold),
        iouThreshold: iouThreshold === '' ? null : Number(iouThreshold),
      }

      const createdLocation = await createLocation(token, {
        locationName,
        descriptiveLocation,
        cameraIdentifier: cameraIdentifier || null,
        liveFeedUrl: liveFeedUrl || null,
        cameraSpecification: Object.values(cameraSpecificationInput).every((value) => value === null)
          ? null
          : cameraSpecificationInput,
        yoloModelMetadata: Object.values(yoloModelMetadataInput).every((value) => value === null)
          ? null
          : yoloModelMetadataInput,
        latitude: latitude === '' ? null : Number(latitude),
        longitude: longitude === '' ? null : Number(longitude),
      })

      setLocations((current) => [createdLocation, ...current])
      setLocationCount((current) => current + 1)
      setLocationName('')
      setDescriptiveLocation('')
      setCameraIdentifier('')
      setLiveFeedUrl('')
      setCameraVendor('')
      setCameraModel('')
      setCameraResolution('')
      setCameraFps('')
      setCameraFov('')
      setModelName('')
      setModelVersion('')
      setConfidenceThreshold('')
      setIouThreshold('')
      setLatitude('')
      setLongitude('')
      setLocationFormError('')
    } catch (error) {
      setLocationFormError(
        error instanceof Error ? error.message : 'Unable to save location.',
      )
    }
  }

  const onCreateCamera = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (cameraName.trim() === '') {
      setCameraFormError('Camera name is required.')
      return
    }

    setCameras((current) => [
      {
        id: makeId(),
        name: cameraName.trim(),
        liveFeedUrl: cameraFeedUrl.trim(),
        yoloModelName: cameraYoloModelName.trim(),
        yoloModelVersion: cameraYoloModelVersion.trim(),
        locationId: null,
      },
      ...current,
    ])

    setCameraName('')
    setCameraFeedUrl('')
    setCameraYoloModelName('')
    setCameraYoloModelVersion('')
    setCameraFormError('')
  }

  const onCreatePrediction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (predictionCameraId === '') {
      setPredictionFormError('Select a camera to log a prediction.')
      return
    }

    if (predictionObjectClass.trim() === '') {
      setPredictionFormError('Object class is required.')
      return
    }

    const confidence = Number(predictionConfidence)

    if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
      setPredictionFormError('Confidence must be between 0 and 1.')
      return
    }

    const camera = cameras.find((item) => item.id === predictionCameraId)

    setPredictions((current) => [
      {
        id: makeId(),
        timestamp: new Date().toISOString(),
        cameraId: predictionCameraId,
        locationId: camera?.locationId ?? null,
        objectClass: predictionObjectClass.trim(),
        confidence,
      },
      ...current,
    ])

    setPredictionObjectClass('')
    setPredictionConfidence('0.70')
    setPredictionFormError('')
  }

  const onCreateObjectClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedClass = className.trim().toLowerCase()

    if (normalizedClass === '') {
      setClassFormError('Object class name is required.')
      return
    }

    if (
      objectClasses.some((objectClass) => objectClass.name.toLowerCase() === normalizedClass)
    ) {
      setClassFormError('Object class already exists.')
      return
    }

    setObjectClasses((current) => [
      {
        id: makeId(),
        name: className.trim(),
      },
      ...current,
    ])

    setClassName('')
    setClassFormError('')
  }

  const onCreateAliasGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (aliasName.trim() === '' || aliasCanonicalClass.trim() === '') {
      setAliasFormError('Alias and canonical class are required.')
      return
    }

    setAliasGroups((current) => [
      {
        id: makeId(),
        alias: aliasName.trim(),
        canonicalClass: aliasCanonicalClass.trim(),
        context: aliasContext.trim(),
      },
      ...current,
    ])

    setAliasName('')
    setAliasCanonicalClass('')
    setAliasContext('')
    setAliasFormError('')
  }

  const onAttachUpload = (event: FormEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]

    if (file === undefined) {
      return
    }

    const dotIndex = file.name.lastIndexOf('.')
    const extension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : ''

    if (!ALLOWED_MODEL_EXTENSIONS.includes(extension)) {
      setUploadError(
        `Invalid model extension. Allowed: ${ALLOWED_MODEL_EXTENSIONS.join(', ')}`,
      )
      event.currentTarget.value = ''
      return
    }

    if (file.size > MAX_MODEL_SIZE_BYTES) {
      setUploadError('Model exceeds the 100MB limit.')
      event.currentTarget.value = ''
      return
    }

    setUploadedYoloModels((current) => [
      {
        id: makeId(),
        fileName: file.name,
        extension,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      },
      ...current,
    ])

    setUploadError('')
    event.currentTarget.value = ''
  }

  const onDragCamera = (event: DragEvent<HTMLElement>, cameraId: string) => {
    event.dataTransfer.setData('text/plain', cameraId)
  }

  const onDropCameraToLocation = (event: DragEvent<HTMLElement>, locationId: number) => {
    event.preventDefault()
    const cameraId = event.dataTransfer.getData('text/plain')

    if (cameraId === '') {
      return
    }

    setCameras((current) =>
      current.map((camera) =>
        camera.id === cameraId ? { ...camera, locationId } : camera,
      ),
    )
  }

  const onDropCameraToUnassigned = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const cameraId = event.dataTransfer.getData('text/plain')

    if (cameraId === '') {
      return
    }

    setCameras((current) =>
      current.map((camera) =>
        camera.id === cameraId ? { ...camera, locationId: null } : camera,
      ),
    )
  }

  const onLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setModules([])
    setLocationCount(0)
    setLocations([])
    setLocationFormError('')
    setLoadError('')
  }

  if (token === null) {
    return (
      <main className="app-shell auth-shell">
        <section className="panel auth-card">
          <h1>Mini Geospatial AI Assist</h1>
          <p>Single-user access. Enter username and 4+ character password.</p>
          <form onSubmit={onLogin} className="grid-form">
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                minLength={4}
                required
              />
            </label>
            <button type="submit" disabled={isAuthenticating}>
              {isAuthenticating ? 'Logging in...' : 'Login'}
            </button>
          </form>
          {loginError !== '' && <p className="error-text">{loginError}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="panel app-header">
        <div>
          <h1>Geospatial Security Dashboard</h1>
          <p>
            {locationCount} locations • {cameras.length} cameras • {predictions.length} predictions
          </p>
        </div>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </header>

      {loadError !== '' && <p className="error-text panel">{loadError}</p>}

      <section className="panel">
        <h2>Platform Modules</h2>
        <div className="module-grid">
          {modules.map((module) => (
            <article key={module.slug} className="module-card">
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Create Camera Placement Location</h2>
        <form className="grid-form three-column" onSubmit={onCreateLocation}>
          <label>
            Location Name
            <input
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              required
            />
          </label>
          <label>
            Camera Identifier
            <input
              value={cameraIdentifier}
              onChange={(event) => setCameraIdentifier(event.target.value)}
            />
          </label>
          <label>
            Live Feed URL
            <input
              value={liveFeedUrl}
              onChange={(event) => setLiveFeedUrl(event.target.value)}
              type="url"
            />
          </label>
          <label className="full-width">
            Descriptive Placement
            <textarea
              value={descriptiveLocation}
              onChange={(event) => setDescriptiveLocation(event.target.value)}
              required
              rows={3}
            />
          </label>
          <label>
            Camera Vendor
            <input
              value={cameraVendor}
              onChange={(event) => setCameraVendor(event.target.value)}
            />
          </label>
          <label>
            Camera Model
            <input
              value={cameraModel}
              onChange={(event) => setCameraModel(event.target.value)}
            />
          </label>
          <label>
            Resolution
            <input
              value={cameraResolution}
              onChange={(event) => setCameraResolution(event.target.value)}
            />
          </label>
          <label>
            FPS
            <input
              value={cameraFps}
              onChange={(event) => setCameraFps(event.target.value)}
              type="number"
              min={1}
              max={240}
            />
          </label>
          <label>
            Field of View
            <input
              value={cameraFov}
              onChange={(event) => setCameraFov(event.target.value)}
            />
          </label>
          <label>
            YOLO Model Name
            <input
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
            />
          </label>
          <label>
            YOLO Model Version
            <input
              value={modelVersion}
              onChange={(event) => setModelVersion(event.target.value)}
            />
          </label>
          <label>
            Confidence Threshold
            <input
              value={confidenceThreshold}
              onChange={(event) => setConfidenceThreshold(event.target.value)}
              type="number"
              min={0}
              max={1}
              step="0.01"
            />
          </label>
          <label>
            IoU Threshold
            <input
              value={iouThreshold}
              onChange={(event) => setIouThreshold(event.target.value)}
              type="number"
              min={0}
              max={1}
              step="0.01"
            />
          </label>
          <label>
            Latitude
            <input
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              type="number"
              step="0.0000001"
              min={-90}
              max={90}
            />
          </label>
          <label>
            Longitude
            <input
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              type="number"
              step="0.0000001"
              min={-180}
              max={180}
            />
          </label>
          <div className="full-width">
            <button type="submit">Save Location</button>
          </div>
        </form>
        {locationFormError !== '' && <p className="error-text">{locationFormError}</p>}
      </section>

      <section className="panel">
        <h2>CCTV Attachment Board (Drag & Drop)</h2>
        <p className="hint-text">
          Drag a camera card into a location drop zone to attach CCTV to that location.
        </p>

        <div className="two-column-grid">
          <article
            className="drop-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDropCameraToUnassigned}
          >
            <h3>Unassigned Cameras</h3>
            <div className="location-grid">
              {cameras
                .filter((camera) => camera.locationId === null)
                .map((camera) => (
                  <div
                    key={camera.id}
                    className="location-card draggable-card"
                    draggable
                    onDragStart={(event) => onDragCamera(event, camera.id)}
                  >
                    <p className="bold-text">{camera.name}</p>
                    <p>{camera.liveFeedUrl || 'No feed URL set'}</p>
                    <p>
                      YOLO: {camera.yoloModelName || '-'} {camera.yoloModelVersion || ''}
                    </p>
                  </div>
                ))}
              {cameras.every((camera) => camera.locationId !== null) && (
                <p>No unassigned cameras.</p>
              )}
            </div>
          </article>

          <article className="sub-panel">
            <h3>Add Camera Inventory</h3>
            <form className="grid-form" onSubmit={onCreateCamera}>
              <label>
                Camera Name
                <input
                  value={cameraName}
                  onChange={(event) => setCameraName(event.target.value)}
                  required
                />
              </label>
              <label>
                Live Feed URL
                <input
                  value={cameraFeedUrl}
                  onChange={(event) => setCameraFeedUrl(event.target.value)}
                  type="url"
                />
              </label>
              <label>
                YOLO Model Name
                <input
                  value={cameraYoloModelName}
                  onChange={(event) => setCameraYoloModelName(event.target.value)}
                />
              </label>
              <label>
                YOLO Model Version
                <input
                  value={cameraYoloModelVersion}
                  onChange={(event) => setCameraYoloModelVersion(event.target.value)}
                />
              </label>
              <button type="submit">Add Camera</button>
            </form>
            {cameraFormError !== '' && <p className="error-text">{cameraFormError}</p>}
          </article>
        </div>

        <div className="location-grid drop-grid">
          {locations.map((location) => {
            const attachedCameraCount = cameras.filter(
              (camera) => camera.locationId === location.id,
            ).length

            return (
              <article
                key={location.id}
                className="location-card drop-zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDropCameraToLocation(event, location.id)}
              >
                <h3>{location.locationName}</h3>
                <p>{location.descriptiveLocation}</p>
                <p>CCTV attached: {attachedCameraCount}</p>
                <p>
                  Coordinates: {location.latitude ?? '-'}, {location.longitude ?? '-'}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Location Viewer (CCTV + YOLO)</h2>
        <label className="compact-label">
          Select Location
          <select
            value={effectiveSelectedLocationId ?? ''}
            onChange={(event) =>
              setSelectedLocationId(
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          >
            <option value="">Select location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.locationName}
              </option>
            ))}
          </select>
        </label>

        {selectedLocation === null ? (
          <p>No location selected.</p>
        ) : (
          <div className="location-grid">
            <article className="location-card">
              <h3>{selectedLocation.locationName}</h3>
              <p>{selectedLocation.descriptiveLocation}</p>
              <p>
                Coordinates: {selectedLocation.latitude ?? '-'}, {selectedLocation.longitude ?? '-'}
              </p>
            </article>
            {selectedLocationCameras.length === 0 ? (
              <article className="location-card">
                <p>No CCTV attached yet.</p>
              </article>
            ) : (
              selectedLocationCameras.map((camera) => (
                <article key={camera.id} className="location-card">
                  <h3>{camera.name}</h3>
                  <p>Feed: {camera.liveFeedUrl || 'No feed URL set'}</p>
                  <p>
                    YOLO: {camera.yoloModelName || 'Unknown'} {camera.yoloModelVersion || ''}
                  </p>
                </article>
              ))
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Predictions Module</h2>
        <form className="grid-form three-column" onSubmit={onCreatePrediction}>
          <label>
            Camera
            <select
              value={predictionCameraId}
              onChange={(event) => setPredictionCameraId(event.target.value)}
              required
            >
              <option value="">Select camera</option>
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Object Class
            <input
              list="known-classes"
              value={predictionObjectClass}
              onChange={(event) => setPredictionObjectClass(event.target.value)}
              required
            />
            <datalist id="known-classes">
              {objectClasses.map((objectClass) => (
                <option key={objectClass.id} value={objectClass.name} />
              ))}
            </datalist>
          </label>
          <label>
            Confidence
            <input
              value={predictionConfidence}
              onChange={(event) => setPredictionConfidence(event.target.value)}
              type="number"
              min={0}
              max={1}
              step="0.01"
              required
            />
          </label>
          <div className="full-width">
            <button type="submit">Add Prediction</button>
          </div>
        </form>
        {predictionFormError !== '' && <p className="error-text">{predictionFormError}</p>}

        <div className="location-grid">
          {predictions.map((prediction) => {
            const camera = cameras.find((item) => item.id === prediction.cameraId)
            const location = locations.find((item) => item.id === prediction.locationId)

            return (
              <article key={prediction.id} className="location-card">
                <h3>{prediction.objectClass}</h3>
                <p>Confidence: {(prediction.confidence * 100).toFixed(1)}%</p>
                <p>Camera: {camera?.name ?? 'Unknown camera'}</p>
                <p>Location: {location?.locationName ?? 'Unassigned'}</p>
                <p>{new Date(prediction.timestamp).toLocaleString()}</p>
              </article>
            )
          })}
          {predictions.length === 0 && <p>No predictions logged yet.</p>}
        </div>
      </section>

      <section className="panel">
        <h2>Object Classes + Alias Grouping</h2>
        <div className="two-column-grid">
          <article className="sub-panel">
            <h3>Object Classes</h3>
            <form className="grid-form" onSubmit={onCreateObjectClass}>
              <label>
                Class Name
                <input
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  required
                />
              </label>
              <button type="submit">Add Class</button>
            </form>
            {classFormError !== '' && <p className="error-text">{classFormError}</p>}
            <ul className="pill-list">
              {objectClasses.map((objectClass) => (
                <li key={objectClass.id}>{objectClass.name}</li>
              ))}
            </ul>
          </article>

          <article className="sub-panel">
            <h3>Alias Groups</h3>
            <form className="grid-form" onSubmit={onCreateAliasGroup}>
              <label>
                Alias
                <input
                  value={aliasName}
                  onChange={(event) => setAliasName(event.target.value)}
                  required
                />
              </label>
              <label>
                Canonical Class
                <input
                  list="canonical-classes"
                  value={aliasCanonicalClass}
                  onChange={(event) => setAliasCanonicalClass(event.target.value)}
                  required
                />
                <datalist id="canonical-classes">
                  {objectClasses.map((objectClass) => (
                    <option key={objectClass.id} value={objectClass.name} />
                  ))}
                </datalist>
              </label>
              <label>
                Context
                <input
                  value={aliasContext}
                  onChange={(event) => setAliasContext(event.target.value)}
                  placeholder="e.g. perimeter zone, parking gate"
                />
              </label>
              <button type="submit">Add Alias Group</button>
            </form>
            {aliasFormError !== '' && <p className="error-text">{aliasFormError}</p>}

            <div className="alias-groups">
              {Object.entries(groupedAliases).map(([canonicalClass, aliases]) => (
                <article key={canonicalClass} className="location-card">
                  <h4>{canonicalClass}</h4>
                  <ul>
                    {aliases.map((alias) => (
                      <li key={alias.id}>
                        {alias.alias}
                        {alias.context !== '' ? ` (${alias.context})` : ''}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
              {aliasGroups.length === 0 && <p>No alias groups created yet.</p>}
            </div>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2>YOLO Model Uploads (Local Storage Metadata)</h2>
        <p className="hint-text">
          Allowed extensions: {ALLOWED_MODEL_EXTENSIONS.join(', ')} • Max file size: 100MB
        </p>
        <input
          type="file"
          accept={ALLOWED_MODEL_EXTENSIONS.join(',')}
          onInput={onAttachUpload}
        />
        {uploadError !== '' && <p className="error-text">{uploadError}</p>}

        <div className="location-grid">
          {uploadedYoloModels.map((upload) => (
            <article key={upload.id} className="location-card">
              <h3>{upload.fileName}</h3>
              <p>Extension: {upload.extension}</p>
              <p>Size: {(upload.sizeBytes / (1024 * 1024)).toFixed(2)} MB</p>
              <p>{new Date(upload.uploadedAt).toLocaleString()}</p>
            </article>
          ))}
          {uploadedYoloModels.length === 0 && <p>No YOLO models uploaded yet.</p>}
        </div>
      </section>
    </main>
  )
}

export default App
