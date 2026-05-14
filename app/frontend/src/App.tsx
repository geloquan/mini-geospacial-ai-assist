import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent, ReactNode } from 'react'
import { login } from './services/api-service'
import type { CameraLocation } from './types/geospatial'
import { useDashboardQuery } from './hooks/use-dashboard-query'
import { useCreateLocationMutation } from './hooks/use-create-location-mutation'

// ─── Types ────────────────────────────────────────────────────────────────────

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

type ObjectClassItem = { id: string; name: string }
type AliasGroup = { id: string; alias: string; canonicalClass: string; context: string }
type UploadedYoloModel = {
  id: string
  fileName: string
  extension: string
  sizeBytes: number
  uploadedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'mini_geospatial_auth_token'
const CAMERAS_KEY = 'mini_geospatial_cameras'
const PREDICTIONS_KEY = 'mini_geospatial_predictions'
const OBJECT_CLASSES_KEY = 'mini_geospatial_object_classes'
const ALIAS_GROUPS_KEY = 'mini_geospatial_alias_groups'
const YOLO_UPLOADS_KEY = 'mini_geospatial_yolo_uploads'
const MAX_MODEL_SIZE_BYTES = 100 * 1024 * 1024
const ALLOWED_MODEL_EXTENSIONS = ['.pt', '.onnx', '.engine', '.tflite', '.pb']
const EMPTY_LOCATIONS: CameraLocation[] = []

// ─── Storage helpers ──────────────────────────────────────────────────────────

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}
const writeStorage = <T,>(key: string, value: T) =>
  localStorage.setItem(key, JSON.stringify(value))

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

// ─── Aceternity-style UI components ──────────────────────────────────────────

/** Animated scanner line that sweeps top→bottom */
function ScanLine() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
        style={{ animation: 'scanline 4s linear infinite' }}
      />
    </div>
  )
}

/** Aceternity-style "spotlight" card with moving border glow */
function GlassPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-700/60 bg-[#111827]/90 p-5 shadow-2xl backdrop-blur-xl ${className}`}
      style={{
        boxShadow:
          '0 0 0 1px rgba(34,197,94,0.07), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-emerald-500/8 to-transparent" />
      {children}
    </div>
  )
}

/** Moving-border button (Aceternity) */
function GreenButton({
                       children,
                       disabled,
                       type = 'button',
                       onClick,
                     }: {
  children: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        relative cursor-pointer overflow-hidden rounded-lg border border-emerald-500/50
        bg-gradient-to-br from-emerald-700 to-emerald-500 px-4 py-2
        font-mono text-sm font-medium text-white transition-all duration-200
        hover:shadow-[0_0_18px_rgba(34,197,94,0.4)] hover:from-emerald-600 hover:to-emerald-400
        disabled:cursor-not-allowed disabled:opacity-40
      `}
    >
      <span className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
      {children}
    </button>
  )
}

function BlueButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-sky-500/50 bg-gradient-to-br from-sky-700 to-sky-500 px-4 py-2 font-mono text-sm font-medium text-white transition-all hover:shadow-[0_0_18px_rgba(14,165,233,0.4)]"
    >
      {children}
    </button>
  )
}

/** Aceternity-style input field */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm text-slate-300">
      <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">{label}</span>
      {children}
    </label>
  )
}

const inputCls = `
  w-full rounded-lg border border-slate-700 bg-[#0b0f14]/70 px-3 py-2
  font-mono text-sm text-slate-100 outline-none transition-all
  placeholder:text-slate-600
  focus:border-sky-500/70 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]
  box-border
`

/** Glowing card (Aceternity "GlowingStarsBackgroundCard" vibe) */
function DataCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={`rounded-xl border border-slate-700/60 bg-[#0b0f14]/55 p-3 shadow-md transition-all hover:border-slate-600/80 ${className}`}
    >
      {children}
    </article>
  )
}

/** Aceternity "BackgroundBeams" strip for header */
function HeaderBeams() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/90 via-[#0f172a]/75 to-sky-500/10" />
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-500/8 blur-3xl" />
    </div>
  )
}

/** Drop zone with dashed animated border */
function DropZone({
                    children,
                    onDragOver,
                    onDrop,
                    className = '',
                  }: {
  children: ReactNode
  onDragOver: (e: DragEvent<HTMLElement>) => void
  onDrop: (e: DragEvent<HTMLElement>) => void
  className?: string
}) {
  return (
    <article
      className={`rounded-xl border border-dashed border-sky-500/30 bg-[#111827]/35 p-3 transition-all hover:border-sky-400/50 ${className}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}
    </article>
  )
}

/** Section heading with accent line */
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-gradient-to-r from-emerald-500/40 to-transparent" />
      <h2 className="font-mono text-base font-semibold tracking-widest text-emerald-400 uppercase">
        {children}
      </h2>
      <span className="h-px flex-1 bg-gradient-to-l from-sky-500/30 to-transparent" />
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [loginError, setLoginError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
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

  const { data: dashboardData, error: dashboardError } = useDashboardQuery(token)
  const createLocationMutation = useCreateLocationMutation()

  const modules = dashboardData?.modules ?? []
  const locationCount = dashboardData?.locationCount ?? 0
  const locations = dashboardData?.locations ?? EMPTY_LOCATIONS
  const loadError =
    dashboardError instanceof Error
      ? dashboardError.message
      : dashboardError === null
        ? ''
        : 'Unable to load dashboard data.'

  useEffect(() => { writeStorage(CAMERAS_KEY, cameras) }, [cameras])
  useEffect(() => { writeStorage(PREDICTIONS_KEY, predictions) }, [predictions])
  useEffect(() => { writeStorage(OBJECT_CLASSES_KEY, objectClasses) }, [objectClasses])
  useEffect(() => { writeStorage(ALIAS_GROUPS_KEY, aliasGroups) }, [aliasGroups])
  useEffect(() => { writeStorage(YOLO_UPLOADS_KEY, uploadedYoloModels) }, [uploadedYoloModels])

  const effectiveSelectedLocationId = selectedLocationId ?? locations[0]?.id ?? null
  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === effectiveSelectedLocationId) ?? null,
    [effectiveSelectedLocationId, locations],
  )
  const selectedLocationCameras = useMemo(
    () => cameras.filter((c) => c.locationId === effectiveSelectedLocationId),
    [cameras, effectiveSelectedLocationId],
  )
  const groupedAliases = useMemo(
    () =>
      aliasGroups.reduce<Record<string, AliasGroup[]>>((acc, ag) => {
        if (!(ag.canonicalClass in acc)) acc[ag.canonicalClass] = []
        acc[ag.canonicalClass].push(ag)
        return acc
      }, {}),
    [aliasGroups],
  )

  // ── Handlers ────────────────────────────────────────────────────────────────

  const onLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsAuthenticating(true)
    setLoginError('')
    try {
      const issued = await login(username, password)
      localStorage.setItem(TOKEN_KEY, issued)
      setToken(issued)
      setUsername('')
      setPassword('')
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const onCreateLocation = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!token) { setLocationFormError('Please login first.'); return }
    try {
      const cameraSpec = {
        vendor: cameraVendor || null,
        model: cameraModel || null,
        resolution: cameraResolution || null,
        fps: cameraFps === '' ? null : Number(cameraFps),
        fieldOfView: cameraFov || null,
      }
      const yoloMeta = {
        modelName: modelName || null,
        modelVersion: modelVersion || null,
        confidenceThreshold: confidenceThreshold === '' ? null : Number(confidenceThreshold),
        iouThreshold: iouThreshold === '' ? null : Number(iouThreshold),
      }
      await createLocationMutation.mutateAsync({
        token,
        payload: {
          locationName, descriptiveLocation,
          cameraIdentifier: cameraIdentifier || null,
          liveFeedUrl: liveFeedUrl || null,
          cameraSpecification: Object.values(cameraSpec).every((v) => v === null) ? null : cameraSpec,
          yoloModelMetadata: Object.values(yoloMeta).every((v) => v === null) ? null : yoloMeta,
          latitude: latitude === '' ? null : Number(latitude),
          longitude: longitude === '' ? null : Number(longitude),
        },
      })
      setLocationName(''); setDescriptiveLocation(''); setCameraIdentifier(''); setLiveFeedUrl('')
      setCameraVendor(''); setCameraModel(''); setCameraResolution(''); setCameraFps('')
      setCameraFov(''); setModelName(''); setModelVersion(''); setConfidenceThreshold('')
      setIouThreshold(''); setLatitude(''); setLongitude(''); setLocationFormError('')
    } catch (err) {
      setLocationFormError(err instanceof Error ? err.message : 'Unable to save location.')
    }
  }

  const onCreateCamera = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (cameraName.trim() === '') { setCameraFormError('Camera name is required.'); return }
    setCameras((cur) => [{
      id: makeId(), name: cameraName.trim(), liveFeedUrl: cameraFeedUrl.trim(),
      yoloModelName: cameraYoloModelName.trim(), yoloModelVersion: cameraYoloModelVersion.trim(),
      locationId: null,
    }, ...cur])
    setCameraName(''); setCameraFeedUrl(''); setCameraYoloModelName('')
    setCameraYoloModelVersion(''); setCameraFormError('')
  }

  const onCreatePrediction = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (predictionCameraId === '') { setPredictionFormError('Select a camera.'); return }
    if (predictionObjectClass.trim() === '') { setPredictionFormError('Object class required.'); return }
    const conf = Number(predictionConfidence)
    if (Number.isNaN(conf) || conf < 0 || conf > 1) { setPredictionFormError('Confidence 0–1.'); return }
    const cam = cameras.find((c) => c.id === predictionCameraId)
    setPredictions((cur) => [{
      id: makeId(), timestamp: new Date().toISOString(),
      cameraId: predictionCameraId, locationId: cam?.locationId ?? null,
      objectClass: predictionObjectClass.trim(), confidence: conf,
    }, ...cur])
    setPredictionObjectClass(''); setPredictionConfidence('0.70'); setPredictionFormError('')
  }

  const onCreateObjectClass = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const norm = className.trim().toLowerCase()
    if (!norm) { setClassFormError('Class name required.'); return }
    if (objectClasses.some((c) => c.name.toLowerCase() === norm)) { setClassFormError('Already exists.'); return }
    setObjectClasses((cur) => [{ id: makeId(), name: className.trim() }, ...cur])
    setClassName(''); setClassFormError('')
  }

  const onCreateAliasGroup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!aliasName.trim() || !aliasCanonicalClass.trim()) { setAliasFormError('Alias + canonical required.'); return }
    setAliasGroups((cur) => [{
      id: makeId(), alias: aliasName.trim(),
      canonicalClass: aliasCanonicalClass.trim(), context: aliasContext.trim(),
    }, ...cur])
    setAliasName(''); setAliasCanonicalClass(''); setAliasContext(''); setAliasFormError('')
  }

  const onAttachUpload = (e: FormEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (!file) return
    const dot = file.name.lastIndexOf('.')
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : ''
    if (!ALLOWED_MODEL_EXTENSIONS.includes(ext)) {
      setUploadError(`Invalid extension. Allowed: ${ALLOWED_MODEL_EXTENSIONS.join(', ')}`)
      e.currentTarget.value = ''; return
    }
    if (file.size > MAX_MODEL_SIZE_BYTES) {
      setUploadError('Exceeds 100MB limit.'); e.currentTarget.value = ''; return
    }
    setUploadedYoloModels((cur) => [{
      id: makeId(), fileName: file.name, extension: ext,
      sizeBytes: file.size, uploadedAt: new Date().toISOString(),
    }, ...cur])
    setUploadError(''); e.currentTarget.value = ''
  }

  const onDragCamera = (e: DragEvent<HTMLElement>, cameraId: string) =>
    e.dataTransfer.setData('text/plain', cameraId)

  const onDropCameraToLocation = (e: DragEvent<HTMLElement>, locationId: number) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    setCameras((cur) => cur.map((c) => c.id === id ? { ...c, locationId } : c))
  }

  const onDropCameraToUnassigned = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    setCameras((cur) => cur.map((c) => c.id === id ? { ...c, locationId: null } : c))
  }

  const onLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setLocationFormError('')
  }

  // ── Auth screen ──────────────────────────────────────────────────────────────

  if (token === null) {
    return (
      <>
        <style>{`
          @keyframes scanline { 0%{top:-1px} 100%{top:100%} }
          @keyframes pulse-ring { 0%,100%{opacity:.15} 50%{opacity:.35} }
        `}</style>
        <main className="flex min-h-screen items-center justify-center bg-[#0b0f14] px-4"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 0% 0%, rgba(34,197,94,.13) 0%, transparent 40%), radial-gradient(circle at 90% 10%, rgba(14,165,233,.15) 0%, transparent 35%), linear-gradient(160deg,#060a0f 0%,#0f172a 50%,#060a0f 100%)',
              }}
        >
          <GlassPanel className="w-full max-w-md">
            <ScanLine />
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h1 className="font-mono text-xl font-bold tracking-wider text-slate-100">
                Mini Geospatial AI Assist
              </h1>
              <p className="mt-1 font-mono text-xs text-slate-500">
                Single-user access · 4+ character password
              </p>
            </div>
            <form onSubmit={onLogin} className="grid gap-3">
              <Field label="Username">
                <input className={inputCls} value={username}
                       onChange={(e) => setUsername(e.target.value)} required />
              </Field>
              <Field label="Password">
                <input className={inputCls} value={password} type="password" minLength={4}
                       onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              <GreenButton type="submit" disabled={isAuthenticating}>
                {isAuthenticating ? '[ authenticating... ]' : '[ login ]'}
              </GreenButton>
            </form>
            {loginError && (
              <p className="mt-2 font-mono text-xs text-red-400">⚠ {loginError}</p>
            )}
          </GlassPanel>
        </main>
      </>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes scanline { 0%{top:-1px} 100%{top:100%} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .fade-in { animation: fadeIn .35s ease both; }
      `}</style>
      <main
        className="mx-auto grid max-w-[1400px] gap-4 px-4 py-6 md:px-6 fade-in"
        style={{
          backgroundAttachment: 'fixed',
        }}
      >
        {/* ── Header ── */}
        <GlassPanel className="!p-0">
          <HeaderBeams />
          <div className="relative flex items-center justify-between gap-3 p-5">
            <div>
              <h1 className="font-mono text-lg font-bold tracking-widest text-slate-100 uppercase">
                Geospatial Security Dashboard
              </h1>
              <p className="mt-0.5 font-mono text-xs text-slate-500">
                <span className="text-emerald-400">{locationCount}</span> locations ·{' '}
                <span className="text-sky-400">{cameras.length}</span> cameras ·{' '}
                <span className="text-amber-400">{predictions.length}</span> predictions
              </p>
            </div>
            <BlueButton onClick={onLogout}>[ logout ]</BlueButton>
          </div>
        </GlassPanel>

        {loadError && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 font-mono text-xs text-red-400">
            ⚠ {loadError}
          </div>
        )}

        {/* ── Platform Modules ── */}
        <GlassPanel>
          <SectionTitle>Platform Modules</SectionTitle>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
            {modules.map((module) => (
              <DataCard key={module.slug}>
                <h3 className="font-mono text-sm font-semibold text-sky-400">{module.title}</h3>
                <p className="mt-1 font-mono text-xs text-slate-500">{module.description}</p>
              </DataCard>
            ))}
          </div>
        </GlassPanel>

        {/* ── Create Location ── */}
        <GlassPanel>
          <SectionTitle>Create Camera Placement Location</SectionTitle>
          <form
            onSubmit={onCreateLocation}
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}
          >
            <Field label="Location Name">
              <input className={inputCls} value={locationName}
                     onChange={(e) => setLocationName(e.target.value)} required />
            </Field>
            <Field label="Camera Identifier">
              <input className={inputCls} value={cameraIdentifier}
                     onChange={(e) => setCameraIdentifier(e.target.value)} />
            </Field>
            <Field label="Live Feed URL">
              <input className={inputCls} value={liveFeedUrl} type="url"
                     onChange={(e) => setLiveFeedUrl(e.target.value)} />
            </Field>
            <div className="col-span-full">
              <Field label="Descriptive Placement">
                <textarea className={inputCls} value={descriptiveLocation} rows={3}
                          onChange={(e) => setDescriptiveLocation(e.target.value)} required />
              </Field>
            </div>
            <Field label="Camera Vendor">
              <input className={inputCls} value={cameraVendor}
                     onChange={(e) => setCameraVendor(e.target.value)} />
            </Field>
            <Field label="Camera Model">
              <input className={inputCls} value={cameraModel}
                     onChange={(e) => setCameraModel(e.target.value)} />
            </Field>
            <Field label="Resolution">
              <input className={inputCls} value={cameraResolution}
                     onChange={(e) => setCameraResolution(e.target.value)} />
            </Field>
            <Field label="FPS">
              <input className={inputCls} value={cameraFps} type="number" min={1} max={240}
                     onChange={(e) => setCameraFps(e.target.value)} />
            </Field>
            <Field label="Field of View">
              <input className={inputCls} value={cameraFov}
                     onChange={(e) => setCameraFov(e.target.value)} />
            </Field>
            <Field label="YOLO Model Name">
              <input className={inputCls} value={modelName}
                     onChange={(e) => setModelName(e.target.value)} />
            </Field>
            <Field label="YOLO Model Version">
              <input className={inputCls} value={modelVersion}
                     onChange={(e) => setModelVersion(e.target.value)} />
            </Field>
            <Field label="Confidence Threshold">
              <input className={inputCls} value={confidenceThreshold} type="number" min={0} max={1} step="0.01"
                     onChange={(e) => setConfidenceThreshold(e.target.value)} />
            </Field>
            <Field label="IoU Threshold">
              <input className={inputCls} value={iouThreshold} type="number" min={0} max={1} step="0.01"
                     onChange={(e) => setIouThreshold(e.target.value)} />
            </Field>
            <Field label="Latitude">
              <input className={inputCls} value={latitude} type="number" step="0.0000001" min={-90} max={90}
                     onChange={(e) => setLatitude(e.target.value)} />
            </Field>
            <Field label="Longitude">
              <input className={inputCls} value={longitude} type="number" step="0.0000001" min={-180} max={180}
                     onChange={(e) => setLongitude(e.target.value)} />
            </Field>
            <div className="col-span-full">
              <GreenButton type="submit">[ save location ]</GreenButton>
            </div>
          </form>
          {locationFormError && (
            <p className="mt-2 font-mono text-xs text-red-400">⚠ {locationFormError}</p>
          )}
        </GlassPanel>

        {/* ── CCTV Attachment Board ── */}
        <GlassPanel>
          <SectionTitle>CCTV Attachment Board (Drag &amp; Drop)</SectionTitle>
          <p className="mb-4 font-mono text-xs text-slate-500">
            Drag a camera card into a location drop zone to attach CCTV.
          </p>

          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
            {/* Unassigned drop zone */}
            <DropZone onDragOver={(e) => e.preventDefault()} onDrop={onDropCameraToUnassigned}>
              <h3 className="mb-2 font-mono text-xs font-semibold tracking-widest text-slate-400 uppercase">
                Unassigned Cameras
              </h3>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
                {cameras.filter((c) => c.locationId === null).map((camera) => (
                  <div
                    key={camera.id}
                    className="cursor-grab rounded-xl border border-slate-700/60 bg-[#0b0f14]/55 p-3 transition-all hover:border-sky-500/40 hover:shadow-[0_0_8px_rgba(14,165,233,0.15)] active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => onDragCamera(e, camera.id)}
                  >
                    <p className="font-mono text-sm font-semibold text-slate-200">{camera.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">{camera.liveFeedUrl || 'No feed URL'}</p>
                    <p className="font-mono text-xs text-slate-600">
                      YOLO: {camera.yoloModelName || '-'} {camera.yoloModelVersion}
                    </p>
                  </div>
                ))}
                {cameras.every((c) => c.locationId !== null) && (
                  <p className="font-mono text-xs text-slate-600">No unassigned cameras.</p>
                )}
              </div>
            </DropZone>

            {/* Add camera form */}
            <div className="rounded-xl border border-slate-700/60 bg-[#0b0f14]/70 p-4">
              <h3 className="mb-3 font-mono text-xs font-semibold tracking-widest text-slate-400 uppercase">
                Add Camera Inventory
              </h3>
              <form className="grid gap-3" onSubmit={onCreateCamera}>
                <Field label="Camera Name">
                  <input className={inputCls} value={cameraName}
                         onChange={(e) => setCameraName(e.target.value)} required />
                </Field>
                <Field label="Live Feed URL">
                  <input className={inputCls} value={cameraFeedUrl} type="url"
                         onChange={(e) => setCameraFeedUrl(e.target.value)} />
                </Field>
                <Field label="YOLO Model Name">
                  <input className={inputCls} value={cameraYoloModelName}
                         onChange={(e) => setCameraYoloModelName(e.target.value)} />
                </Field>
                <Field label="YOLO Model Version">
                  <input className={inputCls} value={cameraYoloModelVersion}
                         onChange={(e) => setCameraYoloModelVersion(e.target.value)} />
                </Field>
                <GreenButton type="submit">[ add camera ]</GreenButton>
              </form>
              {cameraFormError && (
                <p className="mt-2 font-mono text-xs text-red-400">⚠ {cameraFormError}</p>
              )}
            </div>
          </div>

          {/* Location drop targets */}
          <div
            className="mt-3 grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}
          >
            {locations.map((loc) => {
              const count = cameras.filter((c) => c.locationId === loc.id).length
              return (
                <article
                  key={loc.id}
                  className="rounded-xl border border-dashed border-sky-500/30 bg-[#111827]/35 p-3 transition-all hover:border-sky-400/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropCameraToLocation(e, loc.id)}
                >
                  <h3 className="font-mono text-sm font-semibold text-emerald-400">{loc.locationName}</h3>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">{loc.descriptiveLocation}</p>
                  <p className="mt-1 font-mono text-xs text-sky-400">
                    CCTV attached: <span className="font-bold">{count}</span>
                  </p>
                  <p className="font-mono text-xs text-slate-600">
                    {loc.latitude ?? '-'}, {loc.longitude ?? '-'}
                  </p>
                </article>
              )
            })}
          </div>
        </GlassPanel>

        {/* ── Location Viewer ── */}
        <GlassPanel>
          <SectionTitle>Location Viewer (CCTV + YOLO)</SectionTitle>
          <label className="mb-3 grid gap-1.5 text-sm text-slate-300">
            <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">Select Location</span>
            <select
              className={inputCls}
              value={effectiveSelectedLocationId ?? ''}
              onChange={(e) => setSelectedLocationId(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">Select location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.locationName}</option>
              ))}
            </select>
          </label>
          {selectedLocation === null ? (
            <p className="font-mono text-xs text-slate-600">No location selected.</p>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
              <DataCard>
                <h3 className="font-mono text-sm font-semibold text-emerald-400">{selectedLocation.locationName}</h3>
                <p className="mt-0.5 font-mono text-xs text-slate-500">{selectedLocation.descriptiveLocation}</p>
                <p className="mt-1 font-mono text-xs text-slate-600">
                  {selectedLocation.latitude ?? '-'}, {selectedLocation.longitude ?? '-'}
                </p>
              </DataCard>
              {selectedLocationCameras.length === 0 ? (
                <DataCard>
                  <p className="font-mono text-xs text-slate-600">No CCTV attached yet.</p>
                </DataCard>
              ) : (
                selectedLocationCameras.map((cam) => (
                  <DataCard key={cam.id}>
                    <h3 className="font-mono text-sm font-semibold text-sky-400">{cam.name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      Feed: {cam.liveFeedUrl || 'No feed URL'}
                    </p>
                    <p className="font-mono text-xs text-slate-600">
                      YOLO: {cam.yoloModelName || 'Unknown'} {cam.yoloModelVersion}
                    </p>
                  </DataCard>
                ))
              )}
            </div>
          )}
        </GlassPanel>

        {/* ── Predictions Module ── */}
        <GlassPanel>
          <SectionTitle>Predictions Module</SectionTitle>
          <form
            onSubmit={onCreatePrediction}
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}
          >
            <Field label="Camera">
              <select className={inputCls} value={predictionCameraId}
                      onChange={(e) => setPredictionCameraId(e.target.value)} required>
                <option value="">Select camera</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Object Class">
              <input className={inputCls} list="known-classes" value={predictionObjectClass}
                     onChange={(e) => setPredictionObjectClass(e.target.value)} required />
              <datalist id="known-classes">
                {objectClasses.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </Field>
            <Field label="Confidence">
              <input className={inputCls} value={predictionConfidence} type="number"
                     min={0} max={1} step="0.01" required
                     onChange={(e) => setPredictionConfidence(e.target.value)} />
            </Field>
            <div className="col-span-full">
              <GreenButton type="submit">[ add prediction ]</GreenButton>
            </div>
          </form>
          {predictionFormError && (
            <p className="mt-2 font-mono text-xs text-red-400">⚠ {predictionFormError}</p>
          )}
          <div
            className="mt-4 grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}
          >
            {predictions.map((p) => {
              const cam = cameras.find((c) => c.id === p.cameraId)
              const loc = locations.find((l) => l.id === p.locationId)
              return (
                <DataCard key={p.id}>
                  <h3 className="font-mono text-sm font-semibold text-amber-400">{p.objectClass}</h3>
                  <p className="mt-0.5 font-mono text-xs text-emerald-400">
                    {(p.confidence * 100).toFixed(1)}% confidence
                  </p>
                  <p className="font-mono text-xs text-slate-500">Cam: {cam?.name ?? 'Unknown'}</p>
                  <p className="font-mono text-xs text-slate-500">Loc: {loc?.locationName ?? 'Unassigned'}</p>
                  <p className="font-mono text-xs text-slate-600">{new Date(p.timestamp).toLocaleString()}</p>
                </DataCard>
              )
            })}
            {predictions.length === 0 && (
              <p className="font-mono text-xs text-slate-600">No predictions logged yet.</p>
            )}
          </div>
        </GlassPanel>

        {/* ── Object Classes + Alias Grouping ── */}
        <GlassPanel>
          <SectionTitle>Object Classes + Alias Grouping</SectionTitle>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
            {/* Object Classes */}
            <div className="rounded-xl border border-slate-700/60 bg-[#0b0f14]/70 p-4">
              <h3 className="mb-3 font-mono text-xs font-semibold tracking-widest text-slate-400 uppercase">
                Object Classes
              </h3>
              <form className="grid gap-3" onSubmit={onCreateObjectClass}>
                <Field label="Class Name">
                  <input className={inputCls} value={className}
                         onChange={(e) => setClassName(e.target.value)} required />
                </Field>
                <GreenButton type="submit">[ add class ]</GreenButton>
              </form>
              {classFormError && (
                <p className="mt-2 font-mono text-xs text-red-400">⚠ {classFormError}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {objectClasses.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-mono text-xs text-sky-400"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Alias Groups */}
            <div className="rounded-xl border border-slate-700/60 bg-[#0b0f14]/70 p-4">
              <h3 className="mb-3 font-mono text-xs font-semibold tracking-widest text-slate-400 uppercase">
                Alias Groups
              </h3>
              <form className="grid gap-3" onSubmit={onCreateAliasGroup}>
                <Field label="Alias">
                  <input className={inputCls} value={aliasName}
                         onChange={(e) => setAliasName(e.target.value)} required />
                </Field>
                <Field label="Canonical Class">
                  <input className={inputCls} list="canonical-classes" value={aliasCanonicalClass}
                         onChange={(e) => setAliasCanonicalClass(e.target.value)} required />
                  <datalist id="canonical-classes">
                    {objectClasses.map((c) => <option key={c.id} value={c.name} />)}
                  </datalist>
                </Field>
                <Field label="Context">
                  <input className={inputCls} value={aliasContext} placeholder="e.g. perimeter zone"
                         onChange={(e) => setAliasContext(e.target.value)} />
                </Field>
                <GreenButton type="submit">[ add alias group ]</GreenButton>
              </form>
              {aliasFormError && (
                <p className="mt-2 font-mono text-xs text-red-400">⚠ {aliasFormError}</p>
              )}
              <div className="mt-3 grid gap-2">
                {Object.entries(groupedAliases).map(([canon, aliases]) => (
                  <DataCard key={canon}>
                    <h4 className="font-mono text-xs font-bold text-emerald-400">{canon}</h4>
                    <ul className="mt-1 list-disc pl-4">
                      {aliases.map((a) => (
                        <li key={a.id} className="font-mono text-xs text-slate-500">
                          {a.alias}{a.context ? ` (${a.context})` : ''}
                        </li>
                      ))}
                    </ul>
                  </DataCard>
                ))}
                {aliasGroups.length === 0 && (
                  <p className="font-mono text-xs text-slate-600">No alias groups yet.</p>
                )}
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* ── YOLO Model Uploads ── */}
        <GlassPanel>
          <SectionTitle>YOLO Model Uploads</SectionTitle>
          <p className="mb-3 font-mono text-xs text-slate-500">
            Allowed: {ALLOWED_MODEL_EXTENSIONS.join(', ')} · Max 100MB
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-sky-500/40 bg-sky-500/5 px-4 py-3 font-mono text-xs text-sky-400 transition-all hover:border-sky-400/70 hover:bg-sky-500/10">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload YOLO Model
            <input
              type="file"
              accept={ALLOWED_MODEL_EXTENSIONS.join(',')}
              onInput={onAttachUpload}
              className="hidden"
            />
          </label>
          {uploadError && (
            <p className="mt-2 font-mono text-xs text-red-400">⚠ {uploadError}</p>
          )}
          <div
            className="mt-4 grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}
          >
            {uploadedYoloModels.map((u) => (
              <DataCard key={u.id}>
                <h3 className="font-mono text-sm font-semibold text-slate-200">{u.fileName}</h3>
                <p className="mt-0.5 font-mono text-xs text-slate-500">Ext: {u.extension}</p>
                <p className="font-mono text-xs text-slate-500">
                  {(u.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                </p>
                <p className="font-mono text-xs text-slate-600">{new Date(u.uploadedAt).toLocaleString()}</p>
              </DataCard>
            ))}
            {uploadedYoloModels.length === 0 && (
              <p className="font-mono text-xs text-slate-600">No YOLO models uploaded yet.</p>
            )}
          </div>
        </GlassPanel>
      </main>
    </>
  )
}

export default App
