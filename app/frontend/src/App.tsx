import { useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { LogIn, LogOut, Database, MapPin, Camera, Cpu, LayoutDashboard, ChevronRight, Activity } from 'lucide-react'
import { login } from './services/api-service'
import type { CatalogResourceEndpoint } from './services/api-service'
import { useDashboardQuery } from './hooks/use-dashboard-query'
import { useCatalogTableQuery } from './hooks/use-catalog-table-query'
import { useCreateLocationMutation } from './hooks/use-create-location-mutation'
import { useCreateCameraSourceMutation } from './hooks/use-create-camera-source-mutation'
import { useUploadImageProcessorModelMutation } from './hooks/use-upload-image-processor-model-mutation'

const TOKEN_KEY = 'mini_geospatial_auth_token'
const CATALOG_PAGE_SIZE = 10
const EMPTY_CATALOG_ROWS: Record<string, unknown>[] = []

type DashboardView = 'overview' | 'locations' | 'cameraSources' | 'imageProcessors' | 'catalog'

type LocationFormState = {
  locationName: string; descriptiveLocation: string; cameraIdentifier: string; liveFeedUrl: string
  cameraVendor: string; cameraModel: string; cameraResolution: string; cameraFps: string; cameraFov: string
  modelName: string; modelVersion: string; confidenceThreshold: string; iouThreshold: string; latitude: string; longitude: string
}
type CameraSourceFormState = {
  locationId: string; imageProcessorId: string; sourceName: string; cameraIdentifier: string; liveFeedUrl: string
  cameraVendor: string; cameraModel: string; cameraResolution: string; cameraFps: string; cameraFov: string; isActive: '1' | '0'
}
type ImageProcessorFormState = { name: string; modelName: string; modelVersion: string; isActive: '1' | '0' }

const INITIAL_LOCATION_FORM: LocationFormState = {
  locationName: '', descriptiveLocation: '', cameraIdentifier: '', liveFeedUrl: '', cameraVendor: '',
  cameraModel: '', cameraResolution: '', cameraFps: '', cameraFov: '', modelName: '', modelVersion: '',
  confidenceThreshold: '', iouThreshold: '', latitude: '', longitude: '',
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

// ─── Design Tokens ────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #080c14;
    --surface: #0d1420;
    --surface-2: #121a2a;
    --border: rgba(255,255,255,0.07);
    --border-active: rgba(0,225,200,0.35);
    --accent: #00e1c8;
    --accent-dim: rgba(0,225,200,0.12);
    --accent-glow: rgba(0,225,200,0.25);
    --text: #e8edf5;
    --text-muted: #5a6478;
    --text-dim: #8b97aa;
    --danger: #ff4d6d;
    --success: #00d68f;
    --warning: #ffb547;
    --font-display: 'Syne', sans-serif;
    --font-mono: 'IBM Plex Mono', monospace;
    --radius: 10px;
    --radius-lg: 16px;
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
    --shadow-accent: 0 0 20px rgba(0,225,200,0.15);
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-mono); min-height: 100vh; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* Grid noise overlay */
  .app-root::before {
    content: '';
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  .app-root { position: relative; z-index: 1; }

  /* ── Login ── */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
    background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,225,200,0.06) 0%, transparent 70%);
  }
  .login-card {
    width: 100%; max-width: 400px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 40px;
    box-shadow: var(--shadow), 0 0 60px rgba(0,225,200,0.04);
    animation: fadeUp 0.4s ease;
  }
  .login-logo {
    display: flex; align-items: center; gap: 10px; margin-bottom: 32px;
  }
  .login-logo-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 12px var(--accent);
    animation: pulse 2s infinite;
  }
  .login-logo-text {
    font-family: var(--font-display); font-size: 13px; font-weight: 600;
    letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-dim);
  }
  .login-title {
    font-family: var(--font-display); font-size: 26px; font-weight: 800;
    color: var(--text); margin-bottom: 8px; line-height: 1.2;
  }
  .login-sub { font-size: 12px; color: var(--text-muted); margin-bottom: 28px; }

  /* ── Layout ── */
  .layout {
    display: grid; grid-template-columns: 220px 1fr;
    min-height: 100vh;
  }

  /* ── Sidebar ── */
  .sidebar {
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    padding: 24px 0;
    position: sticky; top: 0; height: 100vh;
    overflow-y: auto;
  }
  .sidebar-logo {
    padding: 0 20px 24px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 20px;
    display: flex; align-items: center; gap: 10px;
  }
  .sidebar-logo-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 10px var(--accent);
    flex-shrink: 0; animation: pulse 2s infinite;
  }
  .sidebar-logo-text {
    font-family: var(--font-display); font-size: 11px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-dim);
    line-height: 1.3;
  }
  .sidebar-label {
    font-size: 10px; font-weight: 500; letter-spacing: 0.15em;
    text-transform: uppercase; color: var(--text-muted);
    padding: 0 20px; margin-bottom: 6px;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 20px; cursor: pointer;
    font-size: 12.5px; font-weight: 400; color: var(--text-dim);
    border: none; background: none; width: 100%; text-align: left;
    transition: all 0.15s; position: relative; border-left: 2px solid transparent;
    font-family: var(--font-mono);
  }
  .nav-item:hover { color: var(--text); background: rgba(255,255,255,0.03); }
  .nav-item.active {
    color: var(--accent); background: var(--accent-dim);
    border-left-color: var(--accent);
  }
  .nav-item.active .nav-icon { color: var(--accent); }
  .nav-icon { opacity: 0.7; flex-shrink: 0; }
  .nav-item.active .nav-icon { opacity: 1; }

  .sidebar-bottom { margin-top: auto; padding: 16px 20px 0; border-top: 1px solid var(--border); }
  .sidebar-status {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; color: var(--text-muted); margin-bottom: 12px;
  }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); flex-shrink: 0; }
  .logout-btn {
    display: flex; align-items: center; gap: 8px;
    width: 100%; padding: 9px 12px; border-radius: var(--radius);
    border: 1px solid rgba(255,77,109,0.25); background: rgba(255,77,109,0.06);
    color: #ff7b96; font-size: 12px; cursor: pointer;
    font-family: var(--font-mono); transition: all 0.15s;
  }
  .logout-btn:hover { background: rgba(255,77,109,0.12); border-color: rgba(255,77,109,0.4); }

  /* ── Main content ── */
  .main-content { padding: 32px; display: flex; flex-direction: column; gap: 24px; overflow-x: hidden; }

  /* ── Page Header ── */
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
  .page-title {
    font-family: var(--font-display); font-size: 22px; font-weight: 800; color: var(--text);
  }
  .page-breadcrumb {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: var(--text-muted); margin-bottom: 4px;
  }
  .breadcrumb-sep { opacity: 0.4; }

  /* ── Cards ── */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 28px;
    animation: fadeUp 0.3s ease;
  }
  .card-header {
    display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
    padding-bottom: 16px; border-bottom: 1px solid var(--border);
  }
  .card-icon {
    width: 36px; height: 36px; border-radius: 8px;
    background: var(--accent-dim); border: 1px solid var(--border-active);
    display: flex; align-items: center; justify-content: center; color: var(--accent);
    flex-shrink: 0;
  }
  .card-title {
    font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--text);
  }
  .card-subtitle { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

  /* ── Stat grid ── */
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
  .stat-card {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 20px; position: relative; overflow: hidden;
  }
  .stat-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--accent), transparent);
  }
  .stat-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; }
  .stat-value { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: var(--text); line-height: 1; }
  .stat-unit { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

  /* ── Module list ── */
  .module-item {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 16px; border-radius: var(--radius);
    background: var(--surface-2); border: 1px solid var(--border);
    transition: border-color 0.15s;
  }
  .module-item:hover { border-color: var(--border-active); }
  .module-bullet {
    width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
    margin-top: 5px; flex-shrink: 0; box-shadow: 0 0 8px var(--accent);
  }
  .module-title { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 4px; font-family: var(--font-display); }
  .module-desc { font-size: 11.5px; color: var(--text-dim); line-height: 1.5; }

  /* ── Form ── */
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
  .form-section-title {
    font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted);
    grid-column: 1 / -1; padding-bottom: 8px; border-bottom: 1px solid var(--border);
    margin-top: 4px;
  }
  .form-field { display: flex; flex-direction: column; gap: 6px; }
  .form-label {
    font-size: 11px; color: var(--text-dim); letter-spacing: 0.04em;
    font-family: var(--font-mono);
  }
  .form-required { color: var(--accent); margin-left: 2px; }
  .form-input {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    padding: 10px 12px; font-size: 12.5px; font-family: var(--font-mono);
    outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
  }
  .form-input:focus {
    border-color: var(--border-active);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }
  .form-input::placeholder { color: var(--text-muted); }
  .form-input[type="file"] { padding: 8px 12px; cursor: pointer; }
  .form-actions { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; padding-top: 8px; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 18px; border-radius: var(--radius);
    font-size: 12.5px; font-family: var(--font-mono); font-weight: 500;
    cursor: pointer; border: none; transition: all 0.15s; outline: none;
  }
  .btn-primary {
    background: var(--accent); color: #05100e;
    box-shadow: 0 0 16px var(--accent-glow);
  }
  .btn-primary:hover { background: #1ffcd9; box-shadow: 0 0 24px var(--accent-glow); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
  .btn-ghost {
    background: var(--surface-2); color: var(--text-dim);
    border: 1px solid var(--border);
  }
  .btn-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.15); }
  .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Alerts ── */
  .alert { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: var(--radius); font-size: 12px; }
  .alert-error { background: rgba(255,77,109,0.1); border: 1px solid rgba(255,77,109,0.3); color: #ff7b96; }
  .alert-success { background: rgba(0,214,143,0.1); border: 1px solid rgba(0,214,143,0.3); color: var(--success); }

  /* ── Table ── */
  .table-wrap { overflow-x: auto; border-radius: var(--radius); border: 1px solid var(--border); }
  .data-table { width: 100%; border-collapse: collapse; min-width: 700px; font-size: 12px; }
  .data-table thead { background: var(--surface-2); }
  .data-table th {
    text-align: left; padding: 12px 14px;
    font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--text-muted); font-weight: 500;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .data-table td {
    padding: 11px 14px; border-bottom: 1px solid var(--border);
    color: var(--text-dim); vertical-align: top; font-family: var(--font-mono);
  }
  .data-table tbody tr:last-child td { border-bottom: none; }
  .data-table tbody tr:hover td { background: rgba(255,255,255,0.015); color: var(--text); }
  .table-null { color: var(--text-muted); font-style: italic; }

  /* ── Catalog toolbar ── */
  .catalog-toolbar {
    display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .catalog-select-wrap { flex: 1; min-width: 200px; }
  .catalog-badge {
    padding: 4px 10px; border-radius: 20px; font-size: 10px;
    background: var(--accent-dim); color: var(--accent); border: 1px solid var(--border-active);
    letter-spacing: 0.06em; white-space: nowrap;
  }

  /* ── Pagination ── */
  .pagination { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
  .page-info { font-size: 11px; color: var(--text-muted); margin-left: 4px; }

  /* ── Empty state ── */
  .empty-state { text-align: center; padding: 48px 24px; color: var(--text-muted); font-size: 13px; }
  .empty-icon { margin-bottom: 12px; opacity: 0.3; }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`

function StyleTag() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />
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

  const { data: catalogData, error: catalogError, isFetching: isCatalogFetching } =
    useCatalogTableQuery(token, selectedCatalogEndpoint, selectedCatalogPage, CATALOG_PAGE_SIZE)
  const { data: imageProcessorsData } = useCatalogTableQuery(token, 'catalog/image-processors', 1, 100)

  const modules = dashboardData?.modules ?? []
  const locations = dashboardData?.locations ?? []
  const locationCount = dashboardData?.locationCount ?? 0

  const selectedCatalogLabel = CATALOG_TABLES.find((t) => t.endpoint === selectedCatalogEndpoint)?.label ?? 'Catalog'
  const catalogRows = catalogData?.rows ?? EMPTY_CATALOG_ROWS
  const catalogColumns = useMemo(
    () => Array.from(new Set(catalogRows.flatMap((row) => Object.keys(row)))),
    [catalogRows],
  )
  const imageProcessorOptions = useMemo(() =>
      (imageProcessorsData?.rows ?? [])
        .map((row) => {
          const id = row.id; const name = row.name
          return typeof id === 'number' && typeof name === 'string' ? { id, name } : null
        })
        .filter((r): r is { id: number; name: string } => r !== null),
    [imageProcessorsData?.rows],
  )

  const loadError = dashboardError instanceof Error ? dashboardError.message : ''
  const catalogLoadError = catalogError instanceof Error ? catalogError.message : ''

  const navItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'locations', label: 'Locations', icon: MapPin },
    { key: 'cameraSources', label: 'Camera Sources', icon: Camera },
    { key: 'imageProcessors', label: 'Image Processors', icon: Cpu },
    { key: 'catalog', label: 'Catalog Browser', icon: Database },
  ]

  const viewTitles: Record<DashboardView, string> = {
    overview: 'Platform Overview',
    locations: 'Create Location',
    cameraSources: 'Create Camera Source',
    imageProcessors: 'Create Image Processor',
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

  const onCreateLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) { setLocationFormError('Please login first.'); return }
    try {
      await createLocationMutation.mutateAsync({
        token,
        payload: {
          locationName: locationForm.locationName,
          descriptiveLocation: locationForm.descriptiveLocation,
          cameraIdentifier: locationForm.cameraIdentifier || null,
          liveFeedUrl: locationForm.liveFeedUrl || null,
          cameraSpecification: {
            vendor: locationForm.cameraVendor || null,
            model: locationForm.cameraModel || null,
            resolution: locationForm.cameraResolution || null,
            fps: locationForm.cameraFps ? Number(locationForm.cameraFps) : null,
            fieldOfView: locationForm.cameraFov || null,
          },
          yoloModelMetadata: {
            modelName: locationForm.modelName || null,
            modelVersion: locationForm.modelVersion || null,
            confidenceThreshold: locationForm.confidenceThreshold ? Number(locationForm.confidenceThreshold) : null,
            iouThreshold: locationForm.iouThreshold ? Number(locationForm.iouThreshold) : null,
          },
          latitude: locationForm.latitude ? Number(locationForm.latitude) : null,
          longitude: locationForm.longitude ? Number(locationForm.longitude) : null,
        },
      })
      setLocationForm(INITIAL_LOCATION_FORM); setLocationFormError(''); setLocationFormSuccess('Location created successfully.')
    } catch (error) { setLocationFormError(error instanceof Error ? error.message : 'Unable to create location.'); setLocationFormSuccess('') }
  }

  const onCreateCameraSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) { setCameraSourceFormError('Please login first.'); return }
    if (!cameraSourceForm.locationId) { setCameraSourceFormError('Location is required.'); return }
    try {
      await createCameraSourceMutation.mutateAsync({
        token,
        payload: {
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
        },
      })
      setCameraSourceForm(INITIAL_CAMERA_SOURCE_FORM); setCameraSourceFormError(''); setCameraSourceFormSuccess('Camera source created successfully.')
    } catch (error) { setCameraSourceFormError(error instanceof Error ? error.message : 'Unable to create camera source.'); setCameraSourceFormSuccess('') }
  }

  const onCreateImageProcessor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) { setImageProcessorError('Please login first.'); return }
    if (!imageProcessorFile) { setImageProcessorError('Model file is required.'); return }
    try {
      await uploadImageProcessorModelMutation.mutateAsync({
        token, file: imageProcessorFile,
        payload: {
          name: imageProcessorForm.name,
          modelName: imageProcessorForm.modelName,
          modelVersion: imageProcessorForm.modelVersion,
          isActive: imageProcessorForm.isActive === '1',
        },
      })
      setImageProcessorForm(INITIAL_IMAGE_PROCESSOR_FORM); setImageProcessorFile(null); setImageProcessorError(''); setImageProcessorSuccess('Image processor created successfully.')
    } catch (error) { setImageProcessorError(error instanceof Error ? error.message : 'Unable to create image processor.'); setImageProcessorSuccess('') }
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (token === null) {
    return (
      <>
        <StyleTag />
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
      <StyleTag />
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

            {/* ── Create Location ── */}
            {activeView === 'locations' && (
              <div className="card">
                <div className="card-header">
                  <div className="card-icon"><MapPin size={16} /></div>
                  <div>
                    <div className="card-title">Camera Placement Location</div>
                    <div className="card-subtitle">Register a new monitored site</div>
                  </div>
                </div>

                <form onSubmit={onCreateLocation} style={{ display: 'grid', gap: 16 }}>
                  <div className="form-grid">
                    <div className="form-section-title">Basic Information</div>
                    <div className="form-field">
                      <label className="form-label">Location Name<span className="form-required">*</span></label>
                      <input className="form-input" value={locationForm.locationName} onChange={(e) => setLocationForm((c) => ({ ...c, locationName: e.target.value }))} placeholder="e.g. Building A — North" required />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Descriptive Location<span className="form-required">*</span></label>
                      <input className="form-input" value={locationForm.descriptiveLocation} onChange={(e) => setLocationForm((c) => ({ ...c, descriptiveLocation: e.target.value }))} placeholder="e.g. Main entrance lobby" required />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Latitude</label>
                      <input className="form-input" type="number" min={-90} max={90} step="0.0000001" value={locationForm.latitude} onChange={(e) => setLocationForm((c) => ({ ...c, latitude: e.target.value }))} placeholder="10.7202" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Longitude</label>
                      <input className="form-input" type="number" min={-180} max={180} step="0.0000001" value={locationForm.longitude} onChange={(e) => setLocationForm((c) => ({ ...c, longitude: e.target.value }))} placeholder="122.5621" />
                    </div>

                    <div className="form-section-title">Camera Setup</div>
                    <div className="form-field">
                      <label className="form-label">Camera Identifier</label>
                      <input className="form-input" value={locationForm.cameraIdentifier} onChange={(e) => setLocationForm((c) => ({ ...c, cameraIdentifier: e.target.value }))} placeholder="cam-001" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Live Feed URL</label>
                      <input className="form-input" type="url" value={locationForm.liveFeedUrl} onChange={(e) => setLocationForm((c) => ({ ...c, liveFeedUrl: e.target.value }))} placeholder="rtsp://..." />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Vendor</label>
                      <input className="form-input" value={locationForm.cameraVendor} onChange={(e) => setLocationForm((c) => ({ ...c, cameraVendor: e.target.value }))} placeholder="Hikvision" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Model</label>
                      <input className="form-input" value={locationForm.cameraModel} onChange={(e) => setLocationForm((c) => ({ ...c, cameraModel: e.target.value }))} placeholder="DS-2CD2143G2" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Resolution</label>
                      <input className="form-input" value={locationForm.cameraResolution} onChange={(e) => setLocationForm((c) => ({ ...c, cameraResolution: e.target.value }))} placeholder="1920x1080" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">FPS</label>
                      <input className="form-input" type="number" min={1} max={240} value={locationForm.cameraFps} onChange={(e) => setLocationForm((c) => ({ ...c, cameraFps: e.target.value }))} placeholder="30" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Field of View</label>
                      <input className="form-input" value={locationForm.cameraFov} onChange={(e) => setLocationForm((c) => ({ ...c, cameraFov: e.target.value }))} placeholder="120°" />
                    </div>

                    <div className="form-section-title">YOLO Model Metadata</div>
                    <div className="form-field">
                      <label className="form-label">Model Name</label>
                      <input className="form-input" value={locationForm.modelName} onChange={(e) => setLocationForm((c) => ({ ...c, modelName: e.target.value }))} placeholder="yolov8n" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Model Version</label>
                      <input className="form-input" value={locationForm.modelVersion} onChange={(e) => setLocationForm((c) => ({ ...c, modelVersion: e.target.value }))} placeholder="8.0.0" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Confidence Threshold</label>
                      <input className="form-input" type="number" min={0} max={1} step="0.01" value={locationForm.confidenceThreshold} onChange={(e) => setLocationForm((c) => ({ ...c, confidenceThreshold: e.target.value }))} placeholder="0.50" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">IoU Threshold</label>
                      <input className="form-input" type="number" min={0} max={1} step="0.01" value={locationForm.iouThreshold} onChange={(e) => setLocationForm((c) => ({ ...c, iouThreshold: e.target.value }))} placeholder="0.45" />
                    </div>

                    <div className="form-actions">
                      <button className="btn btn-primary" type="submit" disabled={createLocationMutation.isPending}>
                        <MapPin size={13} />
                        {createLocationMutation.isPending ? 'Creating...' : 'Create Location'}
                      </button>
                      {locationFormSuccess && <div className="alert alert-success" style={{ padding: '6px 12px' }}>{locationFormSuccess}</div>}
                    </div>
                  </div>
                  {locationFormError && <div className="alert alert-error">{locationFormError}</div>}
                </form>
              </div>
            )}

            {/* ── Create Camera Source ── */}
            {activeView === 'cameraSources' && (
              <div className="card">
                <div className="card-header">
                  <div className="card-icon"><Camera size={16} /></div>
                  <div>
                    <div className="card-title">Camera Source</div>
                    <div className="card-subtitle">Add a new camera feed to a location</div>
                  </div>
                </div>
                <form onSubmit={onCreateCameraSource} style={{ display: 'grid', gap: 16 }}>
                  <div className="form-grid">
                    <div className="form-section-title">Association</div>
                    <div className="form-field">
                      <label className="form-label">Location<span className="form-required">*</span></label>
                      <select className="form-input" value={cameraSourceForm.locationId} onChange={(e) => setCameraSourceForm((c) => ({ ...c, locationId: e.target.value }))} required>
                        <option value="">Select a location</option>
                        {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.locationName}</option>)}
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
                      <button className="btn btn-primary" type="submit" disabled={createCameraSourceMutation.isPending}>
                        <Camera size={13} />
                        {createCameraSourceMutation.isPending ? 'Creating...' : 'Create Camera Source'}
                      </button>
                      {cameraSourceFormSuccess && <div className="alert alert-success" style={{ padding: '6px 12px' }}>{cameraSourceFormSuccess}</div>}
                    </div>
                  </div>
                  {cameraSourceFormError && <div className="alert alert-error">{cameraSourceFormError}</div>}
                </form>
              </div>
            )}

            {/* ── Create Image Processor ── */}
            {activeView === 'imageProcessors' && (
              <div className="card">
                <div className="card-header">
                  <div className="card-icon"><Cpu size={16} /></div>
                  <div>
                    <div className="card-title">Image Processor</div>
                    <div className="card-subtitle">Upload a model file and register its metadata</div>
                  </div>
                </div>
                <form onSubmit={onCreateImageProcessor} style={{ display: 'grid', gap: 16 }}>
                  <div className="form-grid">
                    <div className="form-section-title">Processor Identity</div>
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
                      <label className="form-label">Upload Model<span className="form-required">*</span></label>
                      <input className="form-input" type="file" accept=".pt,.onnx,.engine,.tflite,.pb" onChange={(e) => setImageProcessorFile(e.target.files?.[0] ?? null)} required />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Accepted: .pt · .onnx · .engine · .tflite · .pb</span>
                    </div>

                    <div className="form-actions">
                      <button className="btn btn-primary" type="submit" disabled={uploadImageProcessorModelMutation.isPending}>
                        <Cpu size={13} />
                        {uploadImageProcessorModelMutation.isPending ? 'Uploading...' : 'Create Image Processor'}
                      </button>
                      {imageProcessorSuccess && <div className="alert alert-success" style={{ padding: '6px 12px' }}>{imageProcessorSuccess}</div>}
                    </div>
                  </div>
                  {imageProcessorError && <div className="alert alert-error">{imageProcessorError}</div>}
                </form>
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
