import { useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { LogIn, LogOut, Database, MapPin, Camera, Cpu, LayoutDashboard } from 'lucide-react'
import { login } from './services/api-service'
import type { CatalogResourceEndpoint } from './services/api-service'
import { useDashboardQuery } from './hooks/use-dashboard-query'
import { useCatalogTableQuery } from './hooks/use-catalog-table-query'
import { useCreateLocationMutation } from './hooks/use-create-location-mutation'
import { useCreateCameraSourceMutation } from './hooks/use-create-camera-source-mutation'
import { useUploadImageProcessorModelMutation } from './hooks/use-upload-image-processor-model-mutation'

const TOKEN_KEY = 'mini_geospatial_auth_token'
const CATALOG_PAGE_SIZE = 10

type DashboardView = 'overview' | 'locations' | 'cameraSources' | 'imageProcessors' | 'catalog'

type LocationFormState = {
  locationName: string
  descriptiveLocation: string
  cameraIdentifier: string
  liveFeedUrl: string
  cameraVendor: string
  cameraModel: string
  cameraResolution: string
  cameraFps: string
  cameraFov: string
  modelName: string
  modelVersion: string
  confidenceThreshold: string
  iouThreshold: string
  latitude: string
  longitude: string
}

type CameraSourceFormState = {
  locationId: string
  imageProcessorId: string
  sourceName: string
  cameraIdentifier: string
  liveFeedUrl: string
  cameraVendor: string
  cameraModel: string
  cameraResolution: string
  cameraFps: string
  cameraFov: string
  isActive: '1' | '0'
}

type ImageProcessorFormState = {
  name: string
  modelName: string
  modelVersion: string
  isActive: '1' | '0'
}

const INITIAL_LOCATION_FORM: LocationFormState = {
  locationName: '',
  descriptiveLocation: '',
  cameraIdentifier: '',
  liveFeedUrl: '',
  cameraVendor: '',
  cameraModel: '',
  cameraResolution: '',
  cameraFps: '',
  cameraFov: '',
  modelName: '',
  modelVersion: '',
  confidenceThreshold: '',
  iouThreshold: '',
  latitude: '',
  longitude: '',
}

const INITIAL_CAMERA_SOURCE_FORM: CameraSourceFormState = {
  locationId: '',
  imageProcessorId: '',
  sourceName: '',
  cameraIdentifier: '',
  liveFeedUrl: '',
  cameraVendor: '',
  cameraModel: '',
  cameraResolution: '',
  cameraFps: '',
  cameraFov: '',
  isActive: '1',
}

const INITIAL_IMAGE_PROCESSOR_FORM: ImageProcessorFormState = {
  name: '',
  modelName: '',
  modelVersion: '',
  isActive: '1',
}

const CATALOG_TABLES: Array<{ endpoint: CatalogResourceEndpoint; label: string }> = [
  { endpoint: 'catalog/locations', label: 'Locations' },
  { endpoint: 'catalog/camera-sources', label: 'Camera Sources' },
  { endpoint: 'catalog/image-processors', label: 'Image Processors' },
  { endpoint: 'catalog/object-classes', label: 'Object Classes' },
  { endpoint: 'catalog/object-class-aliases', label: 'Object Class Aliases' },
  { endpoint: 'catalog/image-processor-object-classes', label: 'Image Processor Object Classes' },
  { endpoint: 'catalog/prediction-thresholds', label: 'Prediction Thresholds' },
  { endpoint: 'catalog/camera-source-health-logs', label: 'Camera Source Health Logs' },
]

const sectionStyle: CSSProperties = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 16,
}

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
}

const inputStyle: CSSProperties = {
  borderRadius: 8,
  border: '1px solid #334155',
  background: '#0b1220',
  color: '#f1f5f9',
  padding: '8px 10px',
  fontSize: 13,
}

const buttonStyle: CSSProperties = {
  borderRadius: 8,
  border: '1px solid #334155',
  background: '#0369a1',
  color: '#e0f2fe',
  padding: '8px 12px',
  cursor: 'pointer',
}

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [loginError, setLoginError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const [activeView, setActiveView] = useState<DashboardView>('overview')

  const [locationForm, setLocationForm] = useState<LocationFormState>(INITIAL_LOCATION_FORM)
  const [locationFormError, setLocationFormError] = useState('')
  const [locationFormSuccess, setLocationFormSuccess] = useState('')

  const [cameraSourceForm, setCameraSourceForm] = useState<CameraSourceFormState>(INITIAL_CAMERA_SOURCE_FORM)
  const [cameraSourceFormError, setCameraSourceFormError] = useState('')
  const [cameraSourceFormSuccess, setCameraSourceFormSuccess] = useState('')

  const [imageProcessorForm, setImageProcessorForm] = useState<ImageProcessorFormState>(INITIAL_IMAGE_PROCESSOR_FORM)
  const [imageProcessorFile, setImageProcessorFile] = useState<File | null>(null)
  const [imageProcessorError, setImageProcessorError] = useState('')
  const [imageProcessorSuccess, setImageProcessorSuccess] = useState('')

  const [selectedCatalogEndpoint, setSelectedCatalogEndpoint] = useState<CatalogResourceEndpoint>('catalog/locations')
  const [selectedCatalogPage, setSelectedCatalogPage] = useState(1)

  const { data: dashboardData, error: dashboardError } = useDashboardQuery(token)
  const createLocationMutation = useCreateLocationMutation()
  const createCameraSourceMutation = useCreateCameraSourceMutation()
  const uploadImageProcessorModelMutation = useUploadImageProcessorModelMutation()

  const {
    data: catalogData,
    error: catalogError,
    isFetching: isCatalogFetching,
  } = useCatalogTableQuery(token, selectedCatalogEndpoint, selectedCatalogPage, CATALOG_PAGE_SIZE)

  const { data: imageProcessorsData } = useCatalogTableQuery(token, 'catalog/image-processors', 1, 100)

  const modules = dashboardData?.modules ?? []
  const locations = dashboardData?.locations ?? []
  const locationCount = dashboardData?.locationCount ?? 0

  const selectedCatalogLabel = CATALOG_TABLES.find((item) => item.endpoint === selectedCatalogEndpoint)?.label ?? 'Catalog'
  const catalogRows = catalogData?.rows ?? []
  const catalogColumns = useMemo(
    () => Array.from(new Set(catalogRows.flatMap((row) => Object.keys(row)))),
    [catalogRows],
  )

  const imageProcessorOptions = useMemo(() => {
    return (imageProcessorsData?.rows ?? [])
      .map((row) => {
        const id = row.id
        const name = row.name
        return typeof id === 'number' && typeof name === 'string' ? { id, name } : null
      })
      .filter((row): row is { id: number; name: string } => row !== null)
  }, [imageProcessorsData?.rows])

  const loadError = dashboardError instanceof Error ? dashboardError.message : ''
  const catalogLoadError = catalogError instanceof Error ? catalogError.message : ''

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

  const onLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }

  const onCreateLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setLocationFormError('Please login first.')
      return
    }

    try {
      await createLocationMutation.mutateAsync({
        token,
        payload: {
          locationName: locationForm.locationName,
          descriptiveLocation: locationForm.descriptiveLocation,
          cameraIdentifier: locationForm.cameraIdentifier === '' ? null : locationForm.cameraIdentifier,
          liveFeedUrl: locationForm.liveFeedUrl === '' ? null : locationForm.liveFeedUrl,
          cameraSpecification: {
            vendor: locationForm.cameraVendor === '' ? null : locationForm.cameraVendor,
            model: locationForm.cameraModel === '' ? null : locationForm.cameraModel,
            resolution: locationForm.cameraResolution === '' ? null : locationForm.cameraResolution,
            fps: locationForm.cameraFps === '' ? null : Number(locationForm.cameraFps),
            fieldOfView: locationForm.cameraFov === '' ? null : locationForm.cameraFov,
          },
          yoloModelMetadata: {
            modelName: locationForm.modelName === '' ? null : locationForm.modelName,
            modelVersion: locationForm.modelVersion === '' ? null : locationForm.modelVersion,
            confidenceThreshold: locationForm.confidenceThreshold === '' ? null : Number(locationForm.confidenceThreshold),
            iouThreshold: locationForm.iouThreshold === '' ? null : Number(locationForm.iouThreshold),
          },
          latitude: locationForm.latitude === '' ? null : Number(locationForm.latitude),
          longitude: locationForm.longitude === '' ? null : Number(locationForm.longitude),
        },
      })

      setLocationForm(INITIAL_LOCATION_FORM)
      setLocationFormError('')
      setLocationFormSuccess('Location created successfully.')
    } catch (error) {
      setLocationFormError(error instanceof Error ? error.message : 'Unable to create location.')
      setLocationFormSuccess('')
    }
  }

  const onCreateCameraSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setCameraSourceFormError('Please login first.')
      return
    }

    if (cameraSourceForm.locationId === '') {
      setCameraSourceFormError('Location is required.')
      return
    }

    try {
      await createCameraSourceMutation.mutateAsync({
        token,
        payload: {
          locationId: Number(cameraSourceForm.locationId),
          imageProcessorId: cameraSourceForm.imageProcessorId === '' ? null : Number(cameraSourceForm.imageProcessorId),
          sourceName: cameraSourceForm.sourceName,
          cameraIdentifier: cameraSourceForm.cameraIdentifier === '' ? null : cameraSourceForm.cameraIdentifier,
          liveFeedUrl: cameraSourceForm.liveFeedUrl === '' ? null : cameraSourceForm.liveFeedUrl,
          cameraSpecification: {
            vendor: cameraSourceForm.cameraVendor === '' ? null : cameraSourceForm.cameraVendor,
            model: cameraSourceForm.cameraModel === '' ? null : cameraSourceForm.cameraModel,
            resolution: cameraSourceForm.cameraResolution === '' ? null : cameraSourceForm.cameraResolution,
            fps: cameraSourceForm.cameraFps === '' ? null : Number(cameraSourceForm.cameraFps),
            fieldOfView: cameraSourceForm.cameraFov === '' ? null : cameraSourceForm.cameraFov,
          },
          isActive: cameraSourceForm.isActive === '1',
        },
      })

      setCameraSourceForm(INITIAL_CAMERA_SOURCE_FORM)
      setCameraSourceFormError('')
      setCameraSourceFormSuccess('Camera source created successfully.')
    } catch (error) {
      setCameraSourceFormError(error instanceof Error ? error.message : 'Unable to create camera source.')
      setCameraSourceFormSuccess('')
    }
  }

  const onCreateImageProcessor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setImageProcessorError('Please login first.')
      return
    }

    if (!imageProcessorFile) {
      setImageProcessorError('Model file is required.')
      return
    }

    try {
      await uploadImageProcessorModelMutation.mutateAsync({
        token,
        file: imageProcessorFile,
        payload: {
          name: imageProcessorForm.name,
          modelName: imageProcessorForm.modelName,
          modelVersion: imageProcessorForm.modelVersion,
          isActive: imageProcessorForm.isActive === '1',
        },
      })

      setImageProcessorForm(INITIAL_IMAGE_PROCESSOR_FORM)
      setImageProcessorFile(null)
      setImageProcessorError('')
      setImageProcessorSuccess('Image processor created successfully.')
    } catch (error) {
      setImageProcessorError(error instanceof Error ? error.message : 'Unable to create image processor.')
      setImageProcessorSuccess('')
    }
  }

  if (token === null) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
        <section style={{ ...sectionStyle, width: '100%', maxWidth: 380 }}>
          <h1 style={{ margin: '0 0 12px', fontSize: 18 }}>Geospatial AI Login</h1>
          <form onSubmit={onLogin} style={{ display: 'grid', gap: 10 }}>
            <label style={fieldStyle}>
              <span>Username</span>
              <input style={inputStyle} value={username} onChange={(event) => setUsername(event.target.value)} required />
            </label>
            <label style={fieldStyle}>
              <span>Password</span>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={4}
                required
              />
            </label>
            {loginError !== '' && <p style={{ margin: 0, color: '#fb7185' }}>{loginError}</p>}
            <button style={buttonStyle} type="submit" disabled={isAuthenticating}>
              <LogIn size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              {isAuthenticating ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, padding: 16 }}>
      <aside style={{ ...sectionStyle, alignSelf: 'start', position: 'sticky', top: 16 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 14 }}>Dashboard</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            { key: 'overview', label: 'Overview', icon: LayoutDashboard },
            { key: 'locations', label: 'Locations', icon: MapPin },
            { key: 'cameraSources', label: 'Camera Sources', icon: Camera },
            { key: 'imageProcessors', label: 'Image Processors', icon: Cpu },
            { key: 'catalog', label: 'Catalog Browser', icon: Database },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveView(item.key as DashboardView)}
                style={{
                  ...buttonStyle,
                  background: activeView === item.key ? '#0f766e' : '#0b1220',
                  color: activeView === item.key ? '#ccfbf1' : '#cbd5e1',
                  textAlign: 'left',
                }}
              >
                <Icon size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                {item.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onLogout}
          style={{ ...buttonStyle, marginTop: 12, width: '100%', background: '#7f1d1d', color: '#fee2e2' }}
        >
          <LogOut size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          Sign Out
        </button>
      </aside>

      <section style={{ display: 'grid', gap: 16 }}>
        {loadError !== '' && <div style={{ ...sectionStyle, color: '#fb7185' }}>{loadError}</div>}

        {activeView === 'overview' && (
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 12px' }}>Platform Overview</h2>
            <p style={{ margin: '0 0 12px' }}>Locations: {locationCount}</p>
            {modules.length === 0 ? (
              <p style={{ margin: 0, color: '#94a3b8' }}>No modules returned by the dashboard API.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
                {modules.map((module) => (
                  <li key={module.slug}>
                    <strong>{module.title}</strong>: {module.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeView === 'locations' && (
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 12px' }}>Create Camera Placement Location</h2>
            <form onSubmit={onCreateLocation} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <label style={fieldStyle}><span>Location Name *</span><input style={inputStyle} value={locationForm.locationName} onChange={(event) => setLocationForm((current) => ({ ...current, locationName: event.target.value }))} required /></label>
              <label style={fieldStyle}><span>Descriptive Location *</span><input style={inputStyle} value={locationForm.descriptiveLocation} onChange={(event) => setLocationForm((current) => ({ ...current, descriptiveLocation: event.target.value }))} required /></label>
              <label style={fieldStyle}><span>Camera Identifier</span><input style={inputStyle} value={locationForm.cameraIdentifier} onChange={(event) => setLocationForm((current) => ({ ...current, cameraIdentifier: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Live Feed URL</span><input style={inputStyle} type="url" value={locationForm.liveFeedUrl} onChange={(event) => setLocationForm((current) => ({ ...current, liveFeedUrl: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Camera Vendor</span><input style={inputStyle} value={locationForm.cameraVendor} onChange={(event) => setLocationForm((current) => ({ ...current, cameraVendor: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Camera Model</span><input style={inputStyle} value={locationForm.cameraModel} onChange={(event) => setLocationForm((current) => ({ ...current, cameraModel: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Resolution</span><input style={inputStyle} value={locationForm.cameraResolution} onChange={(event) => setLocationForm((current) => ({ ...current, cameraResolution: event.target.value }))} /></label>
              <label style={fieldStyle}><span>FPS</span><input style={inputStyle} type="number" min={1} max={240} value={locationForm.cameraFps} onChange={(event) => setLocationForm((current) => ({ ...current, cameraFps: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Field of View</span><input style={inputStyle} value={locationForm.cameraFov} onChange={(event) => setLocationForm((current) => ({ ...current, cameraFov: event.target.value }))} /></label>
              <label style={fieldStyle}><span>YOLO Model Name</span><input style={inputStyle} value={locationForm.modelName} onChange={(event) => setLocationForm((current) => ({ ...current, modelName: event.target.value }))} /></label>
              <label style={fieldStyle}><span>YOLO Model Version</span><input style={inputStyle} value={locationForm.modelVersion} onChange={(event) => setLocationForm((current) => ({ ...current, modelVersion: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Confidence Threshold</span><input style={inputStyle} type="number" min={0} max={1} step="0.01" value={locationForm.confidenceThreshold} onChange={(event) => setLocationForm((current) => ({ ...current, confidenceThreshold: event.target.value }))} /></label>
              <label style={fieldStyle}><span>IoU Threshold</span><input style={inputStyle} type="number" min={0} max={1} step="0.01" value={locationForm.iouThreshold} onChange={(event) => setLocationForm((current) => ({ ...current, iouThreshold: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Latitude</span><input style={inputStyle} type="number" min={-90} max={90} step="0.0000001" value={locationForm.latitude} onChange={(event) => setLocationForm((current) => ({ ...current, latitude: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Longitude</span><input style={inputStyle} type="number" min={-180} max={180} step="0.0000001" value={locationForm.longitude} onChange={(event) => setLocationForm((current) => ({ ...current, longitude: event.target.value }))} /></label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button style={buttonStyle} type="submit" disabled={createLocationMutation.isPending}>Create Location</button>
                {locationFormSuccess !== '' && <span style={{ color: '#34d399' }}>{locationFormSuccess}</span>}
              </div>
            </form>
            {locationFormError !== '' && <p style={{ margin: '10px 0 0', color: '#fb7185' }}>{locationFormError}</p>}
          </div>
        )}

        {activeView === 'cameraSources' && (
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 12px' }}>Create Camera Source</h2>
            <form onSubmit={onCreateCameraSource} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <label style={fieldStyle}>
                <span>Location *</span>
                <select
                  style={inputStyle}
                  value={cameraSourceForm.locationId}
                  onChange={(event) => setCameraSourceForm((current) => ({ ...current, locationId: event.target.value }))}
                  required
                >
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.locationName}</option>
                  ))}
                </select>
              </label>
              <label style={fieldStyle}><span>Source Name *</span><input style={inputStyle} value={cameraSourceForm.sourceName} onChange={(event) => setCameraSourceForm((current) => ({ ...current, sourceName: event.target.value }))} required /></label>
              <label style={fieldStyle}>
                <span>Image Processor</span>
                <select
                  style={inputStyle}
                  value={cameraSourceForm.imageProcessorId}
                  onChange={(event) => setCameraSourceForm((current) => ({ ...current, imageProcessorId: event.target.value }))}
                >
                  <option value="">None</option>
                  {imageProcessorOptions.map((processor) => (
                    <option key={processor.id} value={processor.id}>{processor.name}</option>
                  ))}
                </select>
              </label>
              <label style={fieldStyle}><span>Camera Identifier</span><input style={inputStyle} value={cameraSourceForm.cameraIdentifier} onChange={(event) => setCameraSourceForm((current) => ({ ...current, cameraIdentifier: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Live Feed URL</span><input style={inputStyle} type="url" value={cameraSourceForm.liveFeedUrl} onChange={(event) => setCameraSourceForm((current) => ({ ...current, liveFeedUrl: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Camera Vendor</span><input style={inputStyle} value={cameraSourceForm.cameraVendor} onChange={(event) => setCameraSourceForm((current) => ({ ...current, cameraVendor: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Camera Model</span><input style={inputStyle} value={cameraSourceForm.cameraModel} onChange={(event) => setCameraSourceForm((current) => ({ ...current, cameraModel: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Resolution</span><input style={inputStyle} value={cameraSourceForm.cameraResolution} onChange={(event) => setCameraSourceForm((current) => ({ ...current, cameraResolution: event.target.value }))} /></label>
              <label style={fieldStyle}><span>FPS</span><input style={inputStyle} type="number" min={1} max={240} value={cameraSourceForm.cameraFps} onChange={(event) => setCameraSourceForm((current) => ({ ...current, cameraFps: event.target.value }))} /></label>
              <label style={fieldStyle}><span>Field of View</span><input style={inputStyle} value={cameraSourceForm.cameraFov} onChange={(event) => setCameraSourceForm((current) => ({ ...current, cameraFov: event.target.value }))} /></label>
              <label style={fieldStyle}>
                <span>Is Active</span>
                <select style={inputStyle} value={cameraSourceForm.isActive} onChange={(event) => setCameraSourceForm((current) => ({ ...current, isActive: event.target.value as '1' | '0' }))}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button style={buttonStyle} type="submit" disabled={createCameraSourceMutation.isPending}>Create Camera Source</button>
                {cameraSourceFormSuccess !== '' && <span style={{ color: '#34d399' }}>{cameraSourceFormSuccess}</span>}
              </div>
            </form>
            {cameraSourceFormError !== '' && <p style={{ margin: '10px 0 0', color: '#fb7185' }}>{cameraSourceFormError}</p>}
          </div>
        )}

        {activeView === 'imageProcessors' && (
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 12px' }}>Create Image Processor</h2>
            <p style={{ margin: '0 0 12px', color: '#94a3b8' }}>
              This form sends explicit user-provided fields for the image processor create request.
            </p>
            <form onSubmit={onCreateImageProcessor} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <label style={fieldStyle}><span>Name *</span><input style={inputStyle} value={imageProcessorForm.name} onChange={(event) => setImageProcessorForm((current) => ({ ...current, name: event.target.value }))} required /></label>
              <label style={fieldStyle}><span>Model Name *</span><input style={inputStyle} value={imageProcessorForm.modelName} onChange={(event) => setImageProcessorForm((current) => ({ ...current, modelName: event.target.value }))} required /></label>
              <label style={fieldStyle}><span>Model Version *</span><input style={inputStyle} value={imageProcessorForm.modelVersion} onChange={(event) => setImageProcessorForm((current) => ({ ...current, modelVersion: event.target.value }))} required /></label>
              <label style={fieldStyle}><span>Model File *</span><input style={inputStyle} type="file" accept=".pt,.onnx,.engine,.tflite,.pb" onChange={(event) => setImageProcessorFile(event.target.files?.[0] ?? null)} required /></label>
              <label style={fieldStyle}>
                <span>Is Active *</span>
                <select style={inputStyle} value={imageProcessorForm.isActive} onChange={(event) => setImageProcessorForm((current) => ({ ...current, isActive: event.target.value as '1' | '0' }))}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button style={buttonStyle} type="submit" disabled={uploadImageProcessorModelMutation.isPending}>Create Image Processor</button>
                {imageProcessorSuccess !== '' && <span style={{ color: '#34d399' }}>{imageProcessorSuccess}</span>}
              </div>
            </form>
            {imageProcessorError !== '' && <p style={{ margin: '10px 0 0', color: '#fb7185' }}>{imageProcessorError}</p>}
          </div>
        )}

        {activeView === 'catalog' && (
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 12px' }}>Catalog Resource Browser</h2>
            <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
              <label style={fieldStyle}>
                <span>Catalog Resource</span>
                <select
                  style={inputStyle}
                  value={selectedCatalogEndpoint}
                  onChange={(event) => {
                    setSelectedCatalogEndpoint(event.target.value as CatalogResourceEndpoint)
                    setSelectedCatalogPage(1)
                  }}
                >
                  {CATALOG_TABLES.map((table) => (
                    <option key={table.endpoint} value={table.endpoint}>{table.label}</option>
                  ))}
                </select>
              </label>
              <p style={{ margin: 0, color: '#94a3b8' }}>{selectedCatalogLabel}</p>
            </div>

            {catalogLoadError !== '' && <p style={{ margin: '0 0 10px', color: '#fb7185' }}>{catalogLoadError}</p>}

            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: 8 }}>
              {catalogColumns.length === 0 ? (
                <p style={{ margin: 0, padding: 16, color: '#94a3b8' }}>
                  {isCatalogFetching ? 'Loading catalog data...' : 'No records available for this resource.'}
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                  <thead>
                    <tr>
                      {catalogColumns.map((column) => (
                        <th key={column} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #334155' }}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catalogRows.map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`}>
                        {catalogColumns.map((column) => (
                          <td key={`${rowIndex}-${column}`} style={{ padding: '8px 10px', borderBottom: '1px solid #1f2937', verticalAlign: 'top' }}>
                            {row[column] === null || row[column] === undefined
                              ? '—'
                              : typeof row[column] === 'object'
                                ? JSON.stringify(row[column])
                                : String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {catalogData && catalogData.lastPage > 1 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => setSelectedCatalogPage((current) => Math.max(1, current - 1))}
                  disabled={catalogData.currentPage <= 1 || isCatalogFetching}
                >
                  Previous
                </button>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => setSelectedCatalogPage((current) => Math.min(catalogData.lastPage, current + 1))}
                  disabled={catalogData.currentPage >= catalogData.lastPage || isCatalogFetching}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
