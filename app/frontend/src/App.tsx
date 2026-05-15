import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { LogIn, LogOut, Database, MapPin, Camera, Cpu, LayoutDashboard, ChevronRight, Activity } from 'lucide-react'
import { login } from './services/api-service'
import type { CatalogResourceEndpoint } from './services/api-service'
import { useDashboardQuery } from './hooks/use-dashboard-query'
import { useCatalogTableQuery } from './hooks/use-catalog-table-query'
import { useCreateLocationMutation } from './hooks/use-create-location-mutation'
import { useUpdateLocationMutation } from './hooks/use-update-location-mutation'
import { useCreateCameraSourceMutation } from './hooks/use-create-camera-source-mutation'
import { useUpdateCameraSourceMutation } from './hooks/use-update-camera-source-mutation'
import { useUploadImageProcessorModelMutation } from './hooks/use-upload-image-processor-model-mutation'
import { useUpdateImageProcessorMutation } from './hooks/use-update-image-processor-mutation'
import './App.css'

const TOKEN_KEY = 'mini_geospatial_auth_token'
const CATALOG_PAGE_SIZE = 10
const EMPTY_CATALOG_ROWS: Record<string, unknown>[] = []

type DashboardView = 'overview' | 'locations' | 'cameraSources' | 'imageProcessors' | 'catalog'
type LocationEditorMode = 'list' | 'create' | 'edit'
type CameraSourceEditorMode = 'list' | 'create' | 'edit'
type ImageProcessorEditorMode = 'list' | 'create' | 'edit'

type LocationFormState = {
  locationName: string
  descriptiveLocation: string
  imagePaths: string
  latitude: string
  longitude: string
}
type CameraSourceFormState = {
  locationId: string; imageProcessorId: string; sourceName: string; cameraIdentifier: string; liveFeedUrl: string
  cameraVendor: string; cameraModel: string; cameraResolution: string; cameraFps: string; cameraFov: string; isActive: '1' | '0'
}
type ImageProcessorFormState = { name: string; modelName: string; modelVersion: string; isActive: '1' | '0' }

const INITIAL_LOCATION_FORM: LocationFormState = {
  locationName: '',
  descriptiveLocation: '',
  imagePaths: '',
  latitude: '',
  longitude: '',
}
const INITIAL_CAMERA_SOURCE_FORM: CameraSourceFormState = {
  locationId: '', imageProcessorId: '', sourceName: '', cameraIdentifier: '', liveFeedUrl: '',
  cameraVendor: '', cameraModel: '', cameraResolution: '', cameraFps: '', cameraFov: '', isActive: '1',
}
const INITIAL_IMAGE_PROCESSOR_FORM: ImageProcessorFormState = { name: '', modelName: '', modelVersion: '', isActive: '1' }

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
  const [locationEditorMode, setLocationEditorMode] = useState<LocationEditorMode>('list')
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null)
  const [selectedLocationsPage, setSelectedLocationsPage] = useState(1)

  const [cameraSourceForm, setCameraSourceForm] = useState<CameraSourceFormState>(INITIAL_CAMERA_SOURCE_FORM)
  const [cameraSourceFormError, setCameraSourceFormError] = useState('')
  const [cameraSourceFormSuccess, setCameraSourceFormSuccess] = useState('')
  const [cameraSourceEditorMode, setCameraSourceEditorMode] = useState<CameraSourceEditorMode>('list')
  const [editingCameraSourceId, setEditingCameraSourceId] = useState<number | null>(null)
  const [selectedCameraSourcesPage, setSelectedCameraSourcesPage] = useState(1)

  const [imageProcessorForm, setImageProcessorForm] = useState<ImageProcessorFormState>(INITIAL_IMAGE_PROCESSOR_FORM)
  const [imageProcessorFile, setImageProcessorFile] = useState<File | null>(null)
  const [imageProcessorError, setImageProcessorError] = useState('')
  const [imageProcessorSuccess, setImageProcessorSuccess] = useState('')
  const [imageProcessorEditorMode, setImageProcessorEditorMode] = useState<ImageProcessorEditorMode>('list')
  const [editingImageProcessorId, setEditingImageProcessorId] = useState<number | null>(null)
  const [selectedImageProcessorsPage, setSelectedImageProcessorsPage] = useState(1)

  const [selectedCatalogEndpoint, setSelectedCatalogEndpoint] = useState<CatalogResourceEndpoint>('catalog/locations')
  const [selectedCatalogPage, setSelectedCatalogPage] = useState(1)

  const { data: dashboardData, error: dashboardError } = useDashboardQuery(token)
  const createLocationMutation = useCreateLocationMutation()
  const updateLocationMutation = useUpdateLocationMutation()
  const createCameraSourceMutation = useCreateCameraSourceMutation()
  const updateCameraSourceMutation = useUpdateCameraSourceMutation()
  const uploadImageProcessorModelMutation = useUploadImageProcessorModelMutation()
  const updateImageProcessorMutation = useUpdateImageProcessorMutation()

  const {
    data: locationsCatalogData,
    error: locationsCatalogError,
    isFetching: isLocationsFetching,
  } = useCatalogTableQuery(token, 'catalog/locations', selectedLocationsPage, CATALOG_PAGE_SIZE)
  const {
    data: cameraSourcesCatalogData,
    error: cameraSourcesCatalogError,
    isFetching: isCameraSourcesFetching,
  } = useCatalogTableQuery(token, 'catalog/camera-sources', selectedCameraSourcesPage, CATALOG_PAGE_SIZE)
  const {
    data: imageProcessorsCatalogData,
    error: imageProcessorsCatalogError,
    isFetching: isImageProcessorsFetching,
  } = useCatalogTableQuery(token, 'catalog/image-processors', selectedImageProcessorsPage, CATALOG_PAGE_SIZE)
  const { data: catalogData, error: catalogError, isFetching: isCatalogFetching } =
    useCatalogTableQuery(token, selectedCatalogEndpoint, selectedCatalogPage, CATALOG_PAGE_SIZE)
  const { data: locationOptionsData } = useCatalogTableQuery(token, 'catalog/locations', 1, 100)
  const { data: imageProcessorOptionsData } = useCatalogTableQuery(token, 'catalog/image-processors', 1, 100)

  const modules = dashboardData?.modules ?? []
  const locationCount = dashboardData?.locationCount ?? 0

  const selectedCatalogLabel = CATALOG_TABLES.find((t) => t.endpoint === selectedCatalogEndpoint)?.label ?? 'Catalog'
  const catalogRows = catalogData?.rows ?? EMPTY_CATALOG_ROWS
  const catalogColumns = useMemo(
    () => Array.from(new Set(catalogRows.flatMap((row) => Object.keys(row)))),
    [catalogRows],
  )
  const imageProcessorOptions = useMemo(() =>
      (imageProcessorOptionsData?.rows ?? [])
        .map((row) => {
          const id = row.id; const name = row.name
          return typeof id === 'number' && typeof name === 'string' ? { id, name } : null
        })
        .filter((r): r is { id: number; name: string } => r !== null),
    [imageProcessorOptionsData?.rows],
  )
  const locationRows = useMemo(
    () =>
      (locationsCatalogData?.rows ?? [])
        .map((row) => {
          const id = row.id
          const locationName = row.location_name
          const descriptiveLocation = row.descriptive_location
          const imagePaths = row.image_paths
          const latitude = row.latitude
          const longitude = row.longitude

          if (typeof id !== 'number' || typeof locationName !== 'string') {
            return null
          }

          return {
            id,
            locationName,
            descriptiveLocation: typeof descriptiveLocation === 'string' ? descriptiveLocation : '',
            imagePaths: Array.isArray(imagePaths)
              ? imagePaths.filter((value): value is string => typeof value === 'string')
              : [],
            latitude:
              typeof latitude === 'number' ? latitude : typeof latitude === 'string' ? Number(latitude) : null,
            longitude:
              typeof longitude === 'number' ? longitude : typeof longitude === 'string' ? Number(longitude) : null,
          }
        })
        .filter(
          (
            location,
          ): location is {
            id: number
            locationName: string
            descriptiveLocation: string
            imagePaths: string[]
            latitude: number | null
            longitude: number | null
          } => location !== null,
        ),
    [locationsCatalogData?.rows],
  )
  const cameraSourceRows = useMemo(
    () =>
      (cameraSourcesCatalogData?.rows ?? [])
        .map((row) => {
          const id = row.id
          const locationId = row.location_id
          const imageProcessorId = row.image_processor_id
          const sourceName = row.source_name
          const cameraIdentifier = row.camera_identifier
          const liveFeedUrl = row.live_feed_url
          const cameraSpecification = row.camera_specification
          const isActive = row.is_active

          if (typeof id !== 'number' || typeof locationId !== 'number' || typeof sourceName !== 'string') {
            return null
          }

          const parsedCameraSpecification =
            cameraSpecification !== null && typeof cameraSpecification === 'object'
              ? (cameraSpecification as Record<string, unknown>)
              : {}

          return {
            id,
            locationId,
            imageProcessorId: typeof imageProcessorId === 'number' ? imageProcessorId : null,
            sourceName,
            cameraIdentifier: typeof cameraIdentifier === 'string' ? cameraIdentifier : '',
            liveFeedUrl: typeof liveFeedUrl === 'string' ? liveFeedUrl : '',
            cameraVendor: typeof parsedCameraSpecification.vendor === 'string' ? parsedCameraSpecification.vendor : '',
            cameraModel: typeof parsedCameraSpecification.model === 'string' ? parsedCameraSpecification.model : '',
            cameraResolution:
              typeof parsedCameraSpecification.resolution === 'string'
                ? parsedCameraSpecification.resolution
                : '',
            cameraFps:
              typeof parsedCameraSpecification.fps === 'number'
                ? parsedCameraSpecification.fps
                : typeof parsedCameraSpecification.fps === 'string'
                  ? Number(parsedCameraSpecification.fps)
                  : null,
            cameraFov:
              typeof parsedCameraSpecification.field_of_view === 'string'
                ? parsedCameraSpecification.field_of_view
                : '',
            isActive:
              typeof isActive === 'boolean'
                ? isActive
                : typeof isActive === 'number'
                  ? isActive === 1
                  : String(isActive) === '1',
          }
        })
        .filter(
          (
            cameraSource,
          ): cameraSource is {
            id: number
            locationId: number
            imageProcessorId: number | null
            sourceName: string
            cameraIdentifier: string
            liveFeedUrl: string
            cameraVendor: string
            cameraModel: string
            cameraResolution: string
            cameraFps: number | null
            cameraFov: string
            isActive: boolean
          } => cameraSource !== null,
        ),
    [cameraSourcesCatalogData?.rows],
  )
  const imageProcessorRows = useMemo(
    () =>
      (imageProcessorsCatalogData?.rows ?? [])
        .map((row) => {
          const id = row.id
          const name = row.name
          const modelName = row.model_name
          const modelVersion = row.model_version
          const modelPath = row.model_path
          const isActive = row.is_active

          if (typeof id !== 'number' || typeof name !== 'string') {
            return null
          }

          return {
            id,
            name,
            modelName: typeof modelName === 'string' ? modelName : '',
            modelVersion: typeof modelVersion === 'string' ? modelVersion : '',
            modelPath: typeof modelPath === 'string' ? modelPath : '',
            isActive:
              typeof isActive === 'boolean'
                ? isActive
                : typeof isActive === 'number'
                  ? isActive === 1
                  : String(isActive) === '1',
          }
        })
        .filter(
          (
            imageProcessor,
          ): imageProcessor is {
            id: number
            name: string
            modelName: string
            modelVersion: string
            modelPath: string
            isActive: boolean
          } => imageProcessor !== null,
        ),
    [imageProcessorsCatalogData?.rows],
  )
  const locationOptions = useMemo(
    () =>
      (locationOptionsData?.rows ?? [])
        .map((row) => {
          const id = row.id
          const locationName = row.location_name
          return typeof id === 'number' && typeof locationName === 'string'
            ? { id, locationName }
            : null
        })
        .filter((location): location is { id: number; locationName: string } => location !== null),
    [locationOptionsData?.rows],
  )

  const loadError = dashboardError instanceof Error ? dashboardError.message : ''
  const catalogLoadError = catalogError instanceof Error ? catalogError.message : ''
  const locationsLoadError = locationsCatalogError instanceof Error ? locationsCatalogError.message : ''
  const cameraSourcesLoadError =
    cameraSourcesCatalogError instanceof Error ? cameraSourcesCatalogError.message : ''
  const imageProcessorsLoadError =
    imageProcessorsCatalogError instanceof Error ? imageProcessorsCatalogError.message : ''

  const navItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'locations', label: 'Locations', icon: MapPin },
    { key: 'cameraSources', label: 'Camera Sources', icon: Camera },
    { key: 'imageProcessors', label: 'Image Processors', icon: Cpu },
    { key: 'catalog', label: 'Catalog Browser', icon: Database },
  ]

  const viewTitles: Record<DashboardView, string> = {
    overview: 'Platform Overview',
    locations: 'Locations',
    cameraSources: 'Camera Sources',
    imageProcessors: 'Image Processors',
    catalog: 'Catalog Browser',
  }

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsAuthenticating(true); setLoginError('')
    try {
      const issuedToken = await login(username, password)
      localStorage.setItem(TOKEN_KEY, issuedToken)
      setToken(issuedToken); setUsername(''); setPassword('')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed.')
    } finally { setIsAuthenticating(false) }
  }

  const onLogout = () => { localStorage.removeItem(TOKEN_KEY); setToken(null) }

  const resetLocationEditor = () => {
    setLocationEditorMode('list')
    setEditingLocationId(null)
    setLocationForm(INITIAL_LOCATION_FORM)
    setLocationFormError('')
    setLocationFormSuccess('')
  }

  const onLocationEdit = (locationId: number) => {
    const selectedLocation = locationRows.find((location) => location.id === locationId)
    if (!selectedLocation) {
      return
    }

    setLocationEditorMode('edit')
    setEditingLocationId(selectedLocation.id)
    setLocationForm({
      locationName: selectedLocation.locationName,
      descriptiveLocation: selectedLocation.descriptiveLocation,
      imagePaths: selectedLocation.imagePaths.join(', '),
      latitude: selectedLocation.latitude === null ? '' : String(selectedLocation.latitude),
      longitude: selectedLocation.longitude === null ? '' : String(selectedLocation.longitude),
    })
    setLocationFormError('')
    setLocationFormSuccess('')
  }

  const onSubmitLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) { setLocationFormError('Please login first.'); return }

    const imagePaths = locationForm.imagePaths
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)

    try {
      const payload = {
        locationName: locationForm.locationName,
        descriptiveLocation: locationForm.descriptiveLocation || null,
        imagePaths,
        latitude: locationForm.latitude ? Number(locationForm.latitude) : null,
        longitude: locationForm.longitude ? Number(locationForm.longitude) : null,
      }

      if (locationEditorMode === 'edit' && editingLocationId !== null) {
        await updateLocationMutation.mutateAsync({
          token,
          locationId: editingLocationId,
          payload,
        })
        setLocationFormSuccess('Location updated successfully.')
      } else {
        await createLocationMutation.mutateAsync({ token, payload })
        setLocationFormSuccess('Location created successfully.')
      }

      setLocationForm(INITIAL_LOCATION_FORM)
      setLocationFormError('')
      setEditingLocationId(null)
      setLocationEditorMode('list')
    } catch (error) { setLocationFormError(error instanceof Error ? error.message : 'Unable to create location.'); setLocationFormSuccess('') }
  }

  const resetCameraSourceEditor = () => {
    setCameraSourceEditorMode('list')
    setEditingCameraSourceId(null)
    setCameraSourceForm(INITIAL_CAMERA_SOURCE_FORM)
    setCameraSourceFormError('')
    setCameraSourceFormSuccess('')
  }

  const onCameraSourceEdit = (cameraSourceId: number) => {
    const selectedCameraSource = cameraSourceRows.find((cameraSource) => cameraSource.id === cameraSourceId)
    if (!selectedCameraSource) {
      return
    }

    setCameraSourceEditorMode('edit')
    setEditingCameraSourceId(selectedCameraSource.id)
    setCameraSourceForm({
      locationId: String(selectedCameraSource.locationId),
      imageProcessorId:
        selectedCameraSource.imageProcessorId === null ? '' : String(selectedCameraSource.imageProcessorId),
      sourceName: selectedCameraSource.sourceName,
      cameraIdentifier: selectedCameraSource.cameraIdentifier,
      liveFeedUrl: selectedCameraSource.liveFeedUrl,
      cameraVendor: selectedCameraSource.cameraVendor,
      cameraModel: selectedCameraSource.cameraModel,
      cameraResolution: selectedCameraSource.cameraResolution,
      cameraFps: selectedCameraSource.cameraFps === null ? '' : String(selectedCameraSource.cameraFps),
      cameraFov: selectedCameraSource.cameraFov,
      isActive: selectedCameraSource.isActive ? '1' : '0',
    })
    setCameraSourceFormError('')
    setCameraSourceFormSuccess('')
  }

  const onSubmitCameraSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) { setCameraSourceFormError('Please login first.'); return }
    if (!cameraSourceForm.locationId) { setCameraSourceFormError('Location is required.'); return }
    try {
      const payload = {
        locationId: Number(cameraSourceForm.locationId),
        imageProcessorId: cameraSourceForm.imageProcessorId ? Number(cameraSourceForm.imageProcessorId) : null,
        sourceName: cameraSourceForm.sourceName,
        cameraIdentifier: cameraSourceForm.cameraIdentifier || null,
        liveFeedUrl: cameraSourceForm.liveFeedUrl || null,
        cameraSpecification: {
          vendor: cameraSourceForm.cameraVendor || null,
          model: cameraSourceForm.cameraModel || null,
          resolution: cameraSourceForm.cameraResolution || null,
          fps: cameraSourceForm.cameraFps ? Number(cameraSourceForm.cameraFps) : null,
          fieldOfView: cameraSourceForm.cameraFov || null,
        },
        isActive: cameraSourceForm.isActive === '1',
      }

      if (cameraSourceEditorMode === 'edit' && editingCameraSourceId !== null) {
        await updateCameraSourceMutation.mutateAsync({
          token,
          cameraSourceId: editingCameraSourceId,
          payload,
        })
        setCameraSourceFormSuccess('Camera source updated successfully.')
      } else {
        await createCameraSourceMutation.mutateAsync({
          token,
          payload,
        })
        setCameraSourceFormSuccess('Camera source created successfully.')
      }

      setCameraSourceForm(INITIAL_CAMERA_SOURCE_FORM)
      setCameraSourceFormError('')
      setEditingCameraSourceId(null)
      setCameraSourceEditorMode('list')
    } catch (error) { setCameraSourceFormError(error instanceof Error ? error.message : 'Unable to save camera source.'); setCameraSourceFormSuccess('') }
  }

  const resetImageProcessorEditor = () => {
    setImageProcessorEditorMode('list')
    setEditingImageProcessorId(null)
    setImageProcessorForm(INITIAL_IMAGE_PROCESSOR_FORM)
    setImageProcessorFile(null)
    setImageProcessorError('')
    setImageProcessorSuccess('')
  }

  const onImageProcessorEdit = (imageProcessorId: number) => {
    const selectedImageProcessor = imageProcessorRows.find((imageProcessor) => imageProcessor.id === imageProcessorId)
    if (!selectedImageProcessor) {
      return
    }

    setImageProcessorEditorMode('edit')
    setEditingImageProcessorId(selectedImageProcessor.id)
    setImageProcessorForm({
      name: selectedImageProcessor.name,
      modelName: selectedImageProcessor.modelName,
      modelVersion: selectedImageProcessor.modelVersion,
      isActive: selectedImageProcessor.isActive ? '1' : '0',
    })
    setImageProcessorFile(null)
    setImageProcessorError('')
    setImageProcessorSuccess('')
  }

  const onSubmitImageProcessor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) { setImageProcessorError('Please login first.'); return }
    if (imageProcessorEditorMode === 'create' && !imageProcessorFile) { setImageProcessorError('Model file is required.'); return }
    try {
      const payload = {
        name: imageProcessorForm.name,
        modelName: imageProcessorForm.modelName,
        modelVersion: imageProcessorForm.modelVersion,
        isActive: imageProcessorForm.isActive === '1',
      }

      if (imageProcessorEditorMode === 'edit' && editingImageProcessorId !== null) {
        await updateImageProcessorMutation.mutateAsync({
          token,
          imageProcessorId: editingImageProcessorId,
          file: imageProcessorFile,
          payload,
        })
        setImageProcessorSuccess('Image processor updated successfully.')
      } else if (imageProcessorFile) {
        await uploadImageProcessorModelMutation.mutateAsync({
          token, file: imageProcessorFile, payload,
        })
        setImageProcessorSuccess('Image processor created successfully.')
      }

      setImageProcessorForm(INITIAL_IMAGE_PROCESSOR_FORM)
      setImageProcessorFile(null)
      setImageProcessorError('')
      setEditingImageProcessorId(null)
      setImageProcessorEditorMode('list')
    } catch (error) { setImageProcessorError(error instanceof Error ? error.message : 'Unable to save image processor.'); setImageProcessorSuccess('') }
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (token === null) {
    return (
      <>
        <div className="app-root">
          <div className="login-wrap">
            <div className="login-card">
              <div className="login-logo">
                <div className="login-logo-dot" />
                <span className="login-logo-text">Geospatial AI · Platform</span>
              </div>
              <h1 className="login-title">Welcome back</h1>
              <p className="login-sub">Sign in to access the control dashboard</p>
              <form onSubmit={onLogin} style={{ display: 'grid', gap: 14 }}>
                <div className="form-field">
                  <label className="form-label">Username</label>
                  <input className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required />
                </div>
                <div className="form-field">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" minLength={4} required />
                </div>
                {loginError && <div className="alert alert-error">{loginError}</div>}
                <button className="btn btn-primary" type="submit" disabled={isAuthenticating} style={{ marginTop: 4 }}>
                  <LogIn size={14} />
                  {isAuthenticating ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="app-root">
        <div className="layout">

          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="sidebar-logo-dot" />
              <span className="sidebar-logo-text">Geospatial AI<br />Control Center</span>
            </div>

            <div style={{ padding: '0 0 16px' }}>
              <p className="sidebar-label">Navigation</p>
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`nav-item${activeView === item.key ? ' active' : ''}`}
                    onClick={() => setActiveView(item.key as DashboardView)}
                  >
                    <Icon size={14} className="nav-icon" />
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div className="sidebar-bottom">
              <div className="sidebar-status">
                <div className="status-dot" />
                <span>System online</span>
              </div>
              <button type="button" className="logout-btn" onClick={onLogout}>
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="main-content">
            {/* Page header */}
            <div>
              <div className="page-breadcrumb">
                <span>Dashboard</span>
                <ChevronRight size={11} className="breadcrumb-sep" />
                <span style={{ color: 'var(--text-dim)' }}>{viewTitles[activeView]}</span>
              </div>
              <div className="page-header">
                <h1 className="page-title">{viewTitles[activeView]}</h1>
                {activeView === 'overview' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                    <Activity size={12} style={{ color: 'var(--success)' }} />
                    Live
                  </div>
                )}
              </div>
            </div>

            {loadError && <div className="alert alert-error">{loadError}</div>}

            {/* ── Overview ── */}
            {activeView === 'overview' && (
              <div style={{ display: 'grid', gap: 20 }}>
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-label">Total Locations</div>
                    <div className="stat-value">{locationCount}</div>
                    <div className="stat-unit">monitoring sites</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Active Modules</div>
                    <div className="stat-value">{modules.length}</div>
                    <div className="stat-unit">platform features</div>
                  </div>
                </div>

                {modules.length === 0 ? (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-icon"><Database size={32} /></div>
                      No modules returned by the dashboard API.
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="card-header">
                      <div className="card-icon"><Cpu size={16} /></div>
                      <div>
                        <div className="card-title">Platform Modules</div>
                        <div className="card-subtitle">Active system capabilities</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {modules.map((module) => (
                        <div key={module.slug} className="module-item">
                          <div className="module-bullet" />
                          <div>
                            <div className="module-title">{module.title}</div>
                            <div className="module-desc">{module.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Locations ── */}
            {activeView === 'locations' && (
              <div className="card">
                <div className="card-header">
                  <div className="card-icon"><MapPin size={16} /></div>
                  <div>
                    <div className="card-title">Camera Placement Locations</div>
                    <div className="card-subtitle">Browse and edit monitored sites</div>
                  </div>
                </div>

                <div className="catalog-toolbar">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      setLocationEditorMode('create')
                      setEditingLocationId(null)
                      setLocationForm(INITIAL_LOCATION_FORM)
                      setLocationFormError('')
                      setLocationFormSuccess('')
                    }}
                  >
                    <MapPin size={13} />
                    Create Location
                  </button>
                  {isLocationsFetching && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading...</div>}
                </div>

                {locationsLoadError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{locationsLoadError}</div>}

                <div className="table-wrap">
                  {locationRows.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon"><Database size={28} /></div>
                      {isLocationsFetching ? 'Fetching locations...' : 'No locations available.'}
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                      <tr>
                        <th>id</th>
                        <th>location_name</th>
                        <th>descriptive_location</th>
                        <th>image_paths</th>
                        <th>latitude</th>
                        <th>longitude</th>
                        <th>actions</th>
                      </tr>
                      </thead>
                      <tbody>
                      {locationRows.map((location) => (
                        <tr key={location.id}>
                          <td>{location.id}</td>
                          <td>{location.locationName}</td>
                          <td>{location.descriptiveLocation || <span className="table-null">—</span>}</td>
                          <td>{location.imagePaths.length === 0 ? <span className="table-null">—</span> : location.imagePaths.join(', ')}</td>
                          <td>{location.latitude === null ? <span className="table-null">—</span> : String(location.latitude)}</td>
                          <td>{location.longitude === null ? <span className="table-null">—</span> : String(location.longitude)}</td>
                          <td>
                            <button className="btn btn-ghost" type="button" onClick={() => onLocationEdit(location.id)}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {locationsCatalogData && locationsCatalogData.lastPage > 1 && (
                  <div className="pagination">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setSelectedLocationsPage((current) => Math.max(1, current - 1))}
                      disabled={locationsCatalogData.currentPage <= 1 || isLocationsFetching}
                    >
                      ← Prev
                    </button>
                    <span className="page-info">Page {locationsCatalogData.currentPage} of {locationsCatalogData.lastPage}</span>
                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        setSelectedLocationsPage((current) =>
                          Math.min(locationsCatalogData.lastPage, current + 1),
                        )}
                      disabled={locationsCatalogData.currentPage >= locationsCatalogData.lastPage || isLocationsFetching}
                    >
                      Next →
                    </button>
                  </div>
                )}

                {locationEditorMode !== 'list' && (
                  <form onSubmit={onSubmitLocation} style={{ display: 'grid', gap: 16, marginTop: 20 }}>
                    <div className="form-grid">
                      <div className="form-section-title">
                        {locationEditorMode === 'edit' ? 'Edit Location' : 'Create Location'}
                      </div>
                      <div className="form-field">
                        <label className="form-label">Location Name<span className="form-required">*</span></label>
                        <input className="form-input" value={locationForm.locationName} onChange={(e) => setLocationForm((current) => ({ ...current, locationName: e.target.value }))} required />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Descriptive Location</label>
                        <input className="form-input" value={locationForm.descriptiveLocation} onChange={(e) => setLocationForm((current) => ({ ...current, descriptiveLocation: e.target.value }))} />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Image Paths (comma separated)</label>
                        <input className="form-input" value={locationForm.imagePaths} onChange={(e) => setLocationForm((current) => ({ ...current, imagePaths: e.target.value }))} placeholder="images/location-1.jpg, images/location-2.jpg" />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Latitude</label>
                        <input className="form-input" type="number" min={-90} max={90} step="0.0000001" value={locationForm.latitude} onChange={(e) => setLocationForm((current) => ({ ...current, latitude: e.target.value }))} />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Longitude</label>
                        <input className="form-input" type="number" min={-180} max={180} step="0.0000001" value={locationForm.longitude} onChange={(e) => setLocationForm((current) => ({ ...current, longitude: e.target.value }))} />
                      </div>
                      <div className="form-actions">
                        <button
                          className="btn btn-primary"
                          type="submit"
                          disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
                        >
                          <MapPin size={13} />
                          {locationEditorMode === 'edit'
                            ? updateLocationMutation.isPending
                              ? 'Saving...'
                              : 'Save Changes'
                            : createLocationMutation.isPending
                              ? 'Creating...'
                              : 'Create Location'}
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={resetLocationEditor}>
                          Cancel
                        </button>
                      </div>
                    </div>
                    {locationFormSuccess && <div className="alert alert-success">{locationFormSuccess}</div>}
                    {locationFormError && <div className="alert alert-error">{locationFormError}</div>}
                  </form>
                )}
              </div>
            )}

            {/* ── Camera Sources ── */}
            {activeView === 'cameraSources' && (
              <div className="card">
                <div className="card-header">
                  <div className="card-icon"><Camera size={16} /></div>
                  <div>
                    <div className="card-title">Camera Sources</div>
                    <div className="card-subtitle">Browse and edit camera feeds</div>
                  </div>
                </div>

                <div className="catalog-toolbar">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      setCameraSourceEditorMode('create')
                      setEditingCameraSourceId(null)
                      setCameraSourceForm(INITIAL_CAMERA_SOURCE_FORM)
                      setCameraSourceFormError('')
                      setCameraSourceFormSuccess('')
                    }}
                  >
                    <Camera size={13} />
                    Create Camera Source
                  </button>
                  {isCameraSourcesFetching && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading...</div>}
                </div>

                {cameraSourcesLoadError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{cameraSourcesLoadError}</div>}

                <div className="table-wrap">
                  {cameraSourceRows.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon"><Database size={28} /></div>
                      {isCameraSourcesFetching ? 'Fetching camera sources...' : 'No camera sources available.'}
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                      <tr>
                        <th>id</th>
                        <th>location_id</th>
                        <th>image_processor_id</th>
                        <th>source_name</th>
                        <th>camera_identifier</th>
                        <th>live_feed_url</th>
                        <th>is_active</th>
                        <th>actions</th>
                      </tr>
                      </thead>
                      <tbody>
                      {cameraSourceRows.map((cameraSource) => (
                        <tr key={cameraSource.id}>
                          <td>{cameraSource.id}</td>
                          <td>{cameraSource.locationId}</td>
                          <td>{cameraSource.imageProcessorId ?? <span className="table-null">—</span>}</td>
                          <td>{cameraSource.sourceName}</td>
                          <td>{cameraSource.cameraIdentifier || <span className="table-null">—</span>}</td>
                          <td>{cameraSource.liveFeedUrl || <span className="table-null">—</span>}</td>
                          <td>{cameraSource.isActive ? 'true' : 'false'}</td>
                          <td>
                            <button className="btn btn-ghost" type="button" onClick={() => onCameraSourceEdit(cameraSource.id)}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {cameraSourcesCatalogData && cameraSourcesCatalogData.lastPage > 1 && (
                  <div className="pagination">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setSelectedCameraSourcesPage((current) => Math.max(1, current - 1))}
                      disabled={cameraSourcesCatalogData.currentPage <= 1 || isCameraSourcesFetching}
                    >
                      ← Prev
                    </button>
                    <span className="page-info">Page {cameraSourcesCatalogData.currentPage} of {cameraSourcesCatalogData.lastPage}</span>
                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        setSelectedCameraSourcesPage((current) =>
                          Math.min(cameraSourcesCatalogData.lastPage, current + 1),
                        )}
                      disabled={cameraSourcesCatalogData.currentPage >= cameraSourcesCatalogData.lastPage || isCameraSourcesFetching}
                    >
                      Next →
                    </button>
                  </div>
                )}

                {cameraSourceEditorMode !== 'list' && (
                  <form onSubmit={onSubmitCameraSource} style={{ display: 'grid', gap: 16, marginTop: 20 }}>
                    <div className="form-grid">
                      <div className="form-section-title">
                        {cameraSourceEditorMode === 'edit' ? 'Edit Camera Source' : 'Create Camera Source'}
                      </div>
                      <div className="form-field">
                        <label className="form-label">Location<span className="form-required">*</span></label>
                        <select className="form-input" value={cameraSourceForm.locationId} onChange={(e) => setCameraSourceForm((c) => ({ ...c, locationId: e.target.value }))} required>
                          <option value="">Select a location</option>
                          {locationOptions.map((loc) => <option key={loc.id} value={loc.id}>{loc.locationName}</option>)}
                        </select>
                      </div>
                      <div className="form-field">
                        <label className="form-label">Image Processor</label>
                        <select className="form-input" value={cameraSourceForm.imageProcessorId} onChange={(e) => setCameraSourceForm((c) => ({ ...c, imageProcessorId: e.target.value }))}>
                          <option value="">None</option>
                          {imageProcessorOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="form-field">
                        <label className="form-label">Source Name<span className="form-required">*</span></label>
                        <input className="form-input" value={cameraSourceForm.sourceName} onChange={(e) => setCameraSourceForm((c) => ({ ...c, sourceName: e.target.value }))} placeholder="Main entrance feed" required />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Status</label>
                        <select className="form-input" value={cameraSourceForm.isActive} onChange={(e) => setCameraSourceForm((c) => ({ ...c, isActive: e.target.value as '1' | '0' }))}>
                          <option value="1">Active</option>
                          <option value="0">Inactive</option>
                        </select>
                      </div>

                      <div className="form-section-title">Camera Details</div>
                      <div className="form-field">
                        <label className="form-label">Camera Identifier</label>
                        <input className="form-input" value={cameraSourceForm.cameraIdentifier} onChange={(e) => setCameraSourceForm((c) => ({ ...c, cameraIdentifier: e.target.value }))} placeholder="cam-002" />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Live Feed URL</label>
                        <input className="form-input" type="url" value={cameraSourceForm.liveFeedUrl} onChange={(e) => setCameraSourceForm((c) => ({ ...c, liveFeedUrl: e.target.value }))} placeholder="rtsp://..." />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Vendor</label>
                        <input className="form-input" value={cameraSourceForm.cameraVendor} onChange={(e) => setCameraSourceForm((c) => ({ ...c, cameraVendor: e.target.value }))} placeholder="Axis" />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Model</label>
                        <input className="form-input" value={cameraSourceForm.cameraModel} onChange={(e) => setCameraSourceForm((c) => ({ ...c, cameraModel: e.target.value }))} placeholder="P3245-V" />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Resolution</label>
                        <input className="form-input" value={cameraSourceForm.cameraResolution} onChange={(e) => setCameraSourceForm((c) => ({ ...c, cameraResolution: e.target.value }))} placeholder="1920x1080" />
                      </div>
                      <div className="form-field">
                        <label className="form-label">FPS</label>
                        <input className="form-input" type="number" min={1} max={240} value={cameraSourceForm.cameraFps} onChange={(e) => setCameraSourceForm((c) => ({ ...c, cameraFps: e.target.value }))} placeholder="30" />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Field of View</label>
                        <input className="form-input" value={cameraSourceForm.cameraFov} onChange={(e) => setCameraSourceForm((c) => ({ ...c, cameraFov: e.target.value }))} placeholder="90°" />
                      </div>

                      <div className="form-actions">
                        <button
                          className="btn btn-primary"
                          type="submit"
                          disabled={createCameraSourceMutation.isPending || updateCameraSourceMutation.isPending}
                        >
                          <Camera size={13} />
                          {cameraSourceEditorMode === 'edit'
                            ? updateCameraSourceMutation.isPending
                              ? 'Saving...'
                              : 'Save Changes'
                            : createCameraSourceMutation.isPending
                              ? 'Creating...'
                              : 'Create Camera Source'}
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={resetCameraSourceEditor}>
                          Cancel
                        </button>
                      </div>
                    </div>
                    {cameraSourceFormSuccess && <div className="alert alert-success">{cameraSourceFormSuccess}</div>}
                    {cameraSourceFormError && <div className="alert alert-error">{cameraSourceFormError}</div>}
                  </form>
                )}
              </div>
            )}

            {/* ── Image Processors ── */}
            {activeView === 'imageProcessors' && (
              <div className="card">
                <div className="card-header">
                  <div className="card-icon"><Cpu size={16} /></div>
                  <div>
                    <div className="card-title">Image Processors</div>
                    <div className="card-subtitle">Browse and edit model metadata</div>
                  </div>
                </div>

                <div className="catalog-toolbar">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      setImageProcessorEditorMode('create')
                      setEditingImageProcessorId(null)
                      setImageProcessorForm(INITIAL_IMAGE_PROCESSOR_FORM)
                      setImageProcessorFile(null)
                      setImageProcessorError('')
                      setImageProcessorSuccess('')
                    }}
                  >
                    <Cpu size={13} />
                    Create Image Processor
                  </button>
                  {isImageProcessorsFetching && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading...</div>}
                </div>

                {imageProcessorsLoadError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{imageProcessorsLoadError}</div>}

                <div className="table-wrap">
                  {imageProcessorRows.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon"><Database size={28} /></div>
                      {isImageProcessorsFetching ? 'Fetching image processors...' : 'No image processors available.'}
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                      <tr>
                        <th>id</th>
                        <th>name</th>
                        <th>model_name</th>
                        <th>model_version</th>
                        <th>model_path</th>
                        <th>is_active</th>
                        <th>actions</th>
                      </tr>
                      </thead>
                      <tbody>
                      {imageProcessorRows.map((imageProcessor) => (
                        <tr key={imageProcessor.id}>
                          <td>{imageProcessor.id}</td>
                          <td>{imageProcessor.name}</td>
                          <td>{imageProcessor.modelName || <span className="table-null">—</span>}</td>
                          <td>{imageProcessor.modelVersion || <span className="table-null">—</span>}</td>
                          <td>{imageProcessor.modelPath || <span className="table-null">—</span>}</td>
                          <td>{imageProcessor.isActive ? 'true' : 'false'}</td>
                          <td>
                            <button className="btn btn-ghost" type="button" onClick={() => onImageProcessorEdit(imageProcessor.id)}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {imageProcessorsCatalogData && imageProcessorsCatalogData.lastPage > 1 && (
                  <div className="pagination">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setSelectedImageProcessorsPage((current) => Math.max(1, current - 1))}
                      disabled={imageProcessorsCatalogData.currentPage <= 1 || isImageProcessorsFetching}
                    >
                      ← Prev
                    </button>
                    <span className="page-info">Page {imageProcessorsCatalogData.currentPage} of {imageProcessorsCatalogData.lastPage}</span>
                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        setSelectedImageProcessorsPage((current) =>
                          Math.min(imageProcessorsCatalogData.lastPage, current + 1),
                        )}
                      disabled={imageProcessorsCatalogData.currentPage >= imageProcessorsCatalogData.lastPage || isImageProcessorsFetching}
                    >
                      Next →
                    </button>
                  </div>
                )}

                {imageProcessorEditorMode !== 'list' && (
                  <form onSubmit={onSubmitImageProcessor} style={{ display: 'grid', gap: 16, marginTop: 20 }}>
                    <div className="form-grid">
                      <div className="form-section-title">
                        {imageProcessorEditorMode === 'edit' ? 'Edit Image Processor' : 'Create Image Processor'}
                      </div>
                      <div className="form-field">
                        <label className="form-label">Name<span className="form-required">*</span></label>
                        <input className="form-input" value={imageProcessorForm.name} onChange={(e) => setImageProcessorForm((c) => ({ ...c, name: e.target.value }))} placeholder="YOLOv8 Nano Detector" required />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Model Name<span className="form-required">*</span></label>
                        <input className="form-input" value={imageProcessorForm.modelName} onChange={(e) => setImageProcessorForm((c) => ({ ...c, modelName: e.target.value }))} placeholder="yolov8n" required />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Model Version<span className="form-required">*</span></label>
                        <input className="form-input" value={imageProcessorForm.modelVersion} onChange={(e) => setImageProcessorForm((c) => ({ ...c, modelVersion: e.target.value }))} placeholder="8.0.196" required />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Status</label>
                        <select className="form-input" value={imageProcessorForm.isActive} onChange={(e) => setImageProcessorForm((c) => ({ ...c, isActive: e.target.value as '1' | '0' }))}>
                          <option value="1">Active</option>
                          <option value="0">Inactive</option>
                        </select>
                      </div>

                      <div className="form-section-title">Model File</div>
                      <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">
                          Upload Model
                          {imageProcessorEditorMode === 'create' && <span className="form-required">*</span>}
                        </label>
                        <input
                          className="form-input"
                          type="file"
                          accept=".pt,.onnx,.engine,.tflite,.pb"
                          onChange={(e) => setImageProcessorFile(e.target.files?.[0] ?? null)}
                          required={imageProcessorEditorMode === 'create'}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          Accepted: .pt · .onnx · .engine · .tflite · .pb
                        </span>
                      </div>

                      <div className="form-actions">
                        <button
                          className="btn btn-primary"
                          type="submit"
                          disabled={uploadImageProcessorModelMutation.isPending || updateImageProcessorMutation.isPending}
                        >
                          <Cpu size={13} />
                          {imageProcessorEditorMode === 'edit'
                            ? updateImageProcessorMutation.isPending
                              ? 'Saving...'
                              : 'Save Changes'
                            : uploadImageProcessorModelMutation.isPending
                              ? 'Uploading...'
                              : 'Create Image Processor'}
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={resetImageProcessorEditor}>
                          Cancel
                        </button>
                      </div>
                    </div>
                    {imageProcessorSuccess && <div className="alert alert-success">{imageProcessorSuccess}</div>}
                    {imageProcessorError && <div className="alert alert-error">{imageProcessorError}</div>}
                  </form>
                )}
              </div>
            )}

            {/* ── Catalog Browser ── */}
            {activeView === 'catalog' && (
              <div className="card">
                <div className="card-header">
                  <div className="card-icon"><Database size={16} /></div>
                  <div>
                    <div className="card-title">Catalog Resource Browser</div>
                    <div className="card-subtitle">Inspect platform data tables</div>
                  </div>
                </div>

                <div className="catalog-toolbar">
                  <div className="catalog-select-wrap">
                    <select
                      className="form-input"
                      style={{ width: '100%' }}
                      value={selectedCatalogEndpoint}
                      onChange={(e) => { setSelectedCatalogEndpoint(e.target.value as CatalogResourceEndpoint); setSelectedCatalogPage(1) }}
                    >
                      {CATALOG_TABLES.map((t) => <option key={t.endpoint} value={t.endpoint}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="catalog-badge">{selectedCatalogLabel}</div>
                  {isCatalogFetching && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading...</div>}
                </div>

                {catalogLoadError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{catalogLoadError}</div>}

                <div className="table-wrap">
                  {catalogColumns.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon"><Database size={28} /></div>
                      {isCatalogFetching ? 'Fetching data...' : 'No records available for this resource.'}
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                      <tr>
                        {catalogColumns.map((col) => <th key={col}>{col}</th>)}
                      </tr>
                      </thead>
                      <tbody>
                      {catalogRows.map((row, i) => (
                        <tr key={`row-${i}`}>
                          {catalogColumns.map((col) => (
                            <td key={`${i}-${col}`}>
                              {row[col] === null || row[col] === undefined
                                ? <span className="table-null">—</span>
                                : typeof row[col] === 'object'
                                  ? <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{JSON.stringify(row[col])}</span>
                                  : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {catalogData && catalogData.lastPage > 1 && (
                  <div className="pagination">
                    <button className="btn btn-ghost" onClick={() => setSelectedCatalogPage((c) => Math.max(1, c - 1))} disabled={catalogData.currentPage <= 1 || isCatalogFetching}>
                      ← Prev
                    </button>
                    <span className="page-info">Page {catalogData.currentPage} of {catalogData.lastPage}</span>
                    <button className="btn btn-ghost" onClick={() => setSelectedCatalogPage((c) => Math.min(catalogData.lastPage, c + 1))} disabled={catalogData.currentPage >= catalogData.lastPage || isCatalogFetching}>
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}

export default App
