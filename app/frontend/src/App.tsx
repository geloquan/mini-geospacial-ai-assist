import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent, ReactNode } from 'react'
import { login } from './services/api-service'
import type { CatalogResourceEndpoint } from './services/api-service'
import type { CameraLocation } from './types/geospatial'
import { useDashboardQuery } from './hooks/use-dashboard-query'
import { useCreateLocationMutation } from './hooks/use-create-location-mutation'
import { useCatalogTableQuery } from './hooks/use-catalog-table-query'
import { useUploadImageProcessorModelMutation } from './hooks/use-upload-image-processor-model-mutation'
import {
  Shield, LogOut, LogIn, MapPin, Camera, Activity, Cpu, Upload, Plus,
  Tag, Link2, Eye, Crosshair, Layers, AlertTriangle, ChevronRight,
  Info, GripVertical, Wifi, Sliders, Box, Maximize2, Zap, Globe,
  CheckCircle2, XCircle, Hash, Clock, BarChart2, Database, FileCode2,
  HelpCircle, Move, LayoutGrid, ScanLine as ScanIcon, Settings2,
} from 'lucide-react'

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
  id: number
  fileName: string
  extension: string
  sizeBytes: number
  uploadedAt: string
  modelPath: string | null
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
const EMPTY_CATALOG_ROWS: Record<string, unknown>[] = []
const CATALOG_PAGE_SIZE = 10

const CATALOG_TABLES: Array<{ endpoint: CatalogResourceEndpoint; label: string }> = [
  { endpoint: 'catalog/locations', label: 'Locations' },
  { endpoint: 'catalog/camera-sources', label: 'Camera Sources' },
  { endpoint: 'catalog/image-processors', label: 'Image Processors' },
  { endpoint: 'catalog/object-classes', label: 'Object Classes' },
  { endpoint: 'catalog/object-class-aliases', label: 'Object Class Aliases' },
  {
    endpoint: 'catalog/image-processor-object-classes',
    label: 'Image Processor Object Classes',
  },
  { endpoint: 'catalog/prediction-thresholds', label: 'Prediction Thresholds' },
  { endpoint: 'catalog/camera-source-health-logs', label: 'Camera Source Health Logs' },
]

// ─── Storage helpers ──────────────────────────────────────────────────────────

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch { return fallback }
}
const writeStorage = <T,>(key: string, value: T) =>
  localStorage.setItem(key, JSON.stringify(value))

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const normalizeUploadedYoloModels = (models: UploadedYoloModel[]): UploadedYoloModel[] =>
  models.map((model, index) => {
    const parsedId = Number(model.id)

    return {
      ...model,
      id: Number.isFinite(parsedId) ? parsedId : Date.now() + index,
      modelPath: model.modelPath ?? null,
    }
  })

// ─── Design Tokens ────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  :root {
    --bg-base: #070b10;
    --bg-surface: #0c1117;
    --bg-elevated: #111827;
    --bg-overlay: rgba(17,24,39,0.92);
    --border-subtle: rgba(255,255,255,0.06);
    --border-default: rgba(255,255,255,0.10);
    --border-strong: rgba(255,255,255,0.18);
    --emerald: #10b981;
    --emerald-dim: rgba(16,185,129,0.15);
    --emerald-glow: rgba(16,185,129,0.35);
    --sky: #0ea5e9;
    --sky-dim: rgba(14,165,233,0.12);
    --amber: #f59e0b;
    --amber-dim: rgba(245,158,11,0.12);
    --rose: #f43f5e;
    --rose-dim: rgba(244,63,94,0.12);
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #475569;
    --text-hint: #334155;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
  }

  body { background: var(--bg-base); font-family: 'Outfit', sans-serif; margin: 0; }

  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(800%); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .fade-up    { animation: fadeUp  0.4s cubic-bezier(.22,1,.36,1) both; }
  .fade-in    { animation: fadeIn  0.3s ease both; }
  .slide-down { animation: slideDown 0.25s ease both; }

  .stagger-1 { animation-delay: 0.05s; }
  .stagger-2 { animation-delay: 0.10s; }
  .stagger-3 { animation-delay: 0.15s; }
  .stagger-4 { animation-delay: 0.20s; }
  .stagger-5 { animation-delay: 0.25s; }

  /* Custom scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.16); }

  /* Focus-visible ring */
  *:focus-visible { outline: 2px solid var(--sky); outline-offset: 2px; border-radius: var(--radius-sm); }

  /* Drag cursor */
  [draggable='true'] { cursor: grab; }
  [draggable='true']:active { cursor: grabbing; }

  /* Tooltip */
  .tooltip-wrap { position: relative; display: inline-flex; }
  .tooltip-wrap:hover .tooltip-box { opacity: 1; pointer-events: auto; transform: translateY(0); }
  .tooltip-box {
    position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%) translateY(4px);
    background: #1e293b; border: 1px solid var(--border-default); border-radius: var(--radius-sm);
    color: var(--text-secondary); font-size: 11px; font-family: 'JetBrains Mono', monospace;
    white-space: nowrap; padding: 5px 9px; pointer-events: none;
    opacity: 0; transition: opacity 0.2s, transform 0.2s; z-index: 50;
  }
`

// ─── Primitive Components ──────────────────────────────────────────────────────

function ScanLine() {
  return (
    <div style={{ position:'absolute',inset:0,overflow:'hidden',borderRadius:'inherit',pointerEvents:'none' }}>
      <div style={{
        position:'absolute',inset:'0 0 auto 0',height:1,
        background:'linear-gradient(90deg,transparent,rgba(16,185,129,0.5),transparent)',
        animation:'scanline 5s linear infinite',
      }}/>
    </div>
  )
}

function LiveDot({ color = 'emerald' }: { color?: 'emerald'|'sky'|'amber'|'rose' }) {
  const map = { emerald:'#10b981', sky:'#0ea5e9', amber:'#f59e0b', rose:'#f43f5e' }
  return (
    <span style={{
      display:'inline-block',width:6,height:6,borderRadius:'50%',flexShrink:0,
      background: map[color], animation:'pulse-dot 2s ease infinite',
      boxShadow:`0 0 6px ${map[color]}`,
    }}/>
  )
}

function Panel({ children, style = {} }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{
      background:'var(--bg-elevated)',
      border:'1px solid var(--border-subtle)',
      borderRadius:'var(--radius-xl)',
      padding:24,
      boxShadow:'0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
      position:'relative',
      overflow:'hidden',
      ...style,
    }}>
      <div style={{
        position:'absolute',inset:0,pointerEvents:'none',borderRadius:'inherit',
        background:'radial-gradient(ellipse at 50% 0%,rgba(16,185,129,0.05) 0%,transparent 70%)',
      }}/>
      {children}
    </section>
  )
}

function SectionTitle({ icon: Icon, children, badge }: { icon: any; children: ReactNode; badge?: string | number }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:20 }}>
      <span style={{
        display:'inline-flex',alignItems:'center',justifyContent:'center',
        width:32,height:32,borderRadius:8,
        background:'var(--emerald-dim)',border:'1px solid rgba(16,185,129,0.2)',flexShrink:0,
      }}>
        <Icon size={15} color='var(--emerald)' strokeWidth={2}/>
      </span>
      <h2 style={{
        fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,
        letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--text-primary)',margin:0,
      }}>{children}</h2>
      {badge !== undefined && (
        <span style={{
          marginLeft:'auto',fontFamily:"'JetBrains Mono',monospace",fontSize:10,
          color:'var(--emerald)',background:'var(--emerald-dim)',
          border:'1px solid rgba(16,185,129,0.25)',borderRadius:99,padding:'2px 8px',
        }}>{badge}</span>
      )}
      <span style={{ flex:1,height:1,background:'linear-gradient(90deg,var(--border-subtle),transparent)',marginLeft:8 }}/>
    </div>
  )
}

/* ── Guided Field: label + icon + input + hint + optional error ── */
type FieldGuideProps = {
  label: string
  icon: any
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}
function FieldGuide({ label, icon: Icon, hint, error, required, children }: FieldGuideProps) {
  return (
    <div style={{ display:'grid',gap:5 }}>
      <label style={{ display:'flex',alignItems:'center',gap:5,userSelect:'none' }}>
        <Icon size={12} color='var(--text-muted)' strokeWidth={2}/>
        <span style={{
          fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:500,
          letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-secondary)',
        }}>
          {label}
          {required && <span style={{ color:'var(--rose)',marginLeft:2 }}>*</span>}
        </span>
      </label>
      {children}
      {hint && !error && (
        <p style={{ margin:0,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-hint)',display:'flex',alignItems:'center',gap:4 }}>
          <Info size={9} color='var(--text-hint)'/> {hint}
        </p>
      )}
      {error && (
        <p style={{ margin:0,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--rose)',display:'flex',alignItems:'center',gap:4 }} className="slide-down">
          <AlertTriangle size={9}/> {error}
        </p>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width:'100%',borderRadius:'var(--radius-sm)',
  border:'1px solid var(--border-default)',background:'var(--bg-surface)',
  padding:'8px 11px',fontFamily:"'JetBrains Mono',monospace",fontSize:12,
  color:'var(--text-primary)',outline:'none',transition:'border-color 0.15s, box-shadow 0.15s',
  boxSizing:'border-box',
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        ...inputStyle,
        borderColor: focused ? 'var(--sky)' : 'var(--border-default)',
        boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.12)' : 'none',
        ...(props.style||{}),
      }}
    />
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        ...inputStyle,resize:'vertical',minHeight:72,
        borderColor: focused ? 'var(--sky)' : 'var(--border-default)',
        boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.12)' : 'none',
      }}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        ...inputStyle,appearance:'none',cursor:'pointer',
        borderColor: focused ? 'var(--sky)' : 'var(--border-default)',
        boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.12)' : 'none',
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat:'no-repeat',backgroundPosition:'calc(100% - 10px) center',paddingRight:28,
      }}
    />
  )
}

type BtnVariant = 'emerald' | 'sky' | 'rose' | 'ghost'
function Btn({
               children, variant = 'emerald', icon: Icon, disabled, type = 'button', onClick, fullWidth, size = 'md',
             }: {
  children: ReactNode; variant?: BtnVariant; icon?: any; disabled?: boolean;
  type?: 'button'|'submit'; onClick?: () => void; fullWidth?: boolean; size?: 'sm'|'md';
}) {
  const styles: Record<BtnVariant,React.CSSProperties> = {
    emerald: { background:'linear-gradient(135deg,#059669,#10b981)', border:'1px solid rgba(16,185,129,0.4)', color:'#ecfdf5' },
    sky:     { background:'linear-gradient(135deg,#0369a1,#0ea5e9)', border:'1px solid rgba(14,165,233,0.4)',  color:'#e0f2fe' },
    rose:    { background:'linear-gradient(135deg,#be123c,#f43f5e)', border:'1px solid rgba(244,63,94,0.4)',   color:'#ffe4e6' },
    ghost:   { background:'transparent', border:'1px solid var(--border-default)', color:'var(--text-secondary)' },
  }
  const hoverShadow: Record<BtnVariant,string> = {
    emerald:'0 0 20px rgba(16,185,129,0.35)',
    sky:    '0 0 20px rgba(14,165,233,0.35)',
    rose:   '0 0 20px rgba(244,63,94,0.35)',
    ghost:  '0 2px 8px rgba(0,0,0,0.3)',
  }
  const [hovered, setHovered] = useState(false)
  const pad = size === 'sm' ? '5px 12px' : '8px 16px'
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles[variant],
        display:'inline-flex',alignItems:'center',gap:6,cursor:disabled?'not-allowed':'pointer',
        padding:pad,borderRadius:'var(--radius-sm)',
        fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,letterSpacing:'0.05em',
        transition:'box-shadow 0.15s,opacity 0.15s,transform 0.1s',
        opacity: disabled ? 0.4 : 1,
        boxShadow: hovered && !disabled ? hoverShadow[variant] : 'none',
        transform: hovered && !disabled ? 'translateY(-1px)' : 'none',
        width: fullWidth ? '100%' : undefined,
        justifyContent: fullWidth ? 'center' : undefined,
      }}
    >
      {Icon && <Icon size={13} strokeWidth={2.5}/>}
      {children}
    </button>
  )
}

function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'emerald'|'sky'|'amber'|'rose'|'default' }) {
  const colors = {
    emerald:{ bg:'rgba(16,185,129,0.1)',border:'rgba(16,185,129,0.25)',color:'#34d399' },
    sky:    { bg:'rgba(14,165,233,0.1)',border:'rgba(14,165,233,0.25)',color:'#38bdf8' },
    amber:  { bg:'rgba(245,158,11,0.1)',border:'rgba(245,158,11,0.25)',color:'#fbbf24' },
    rose:   { bg:'rgba(244,63,94,0.1)', border:'rgba(244,63,94,0.25)', color:'#fb7185' },
    default:{ bg:'rgba(255,255,255,0.05)',border:'rgba(255,255,255,0.1)',color:'var(--text-secondary)' },
  }
  const c = colors[variant]
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:4,
      padding:'2px 8px',borderRadius:99,fontSize:10,
      fontFamily:"'JetBrains Mono',monospace",fontWeight:500,
      background:c.bg,border:`1px solid ${c.border}`,color:c.color,
    }}>{children}</span>
  )
}

function Card({ children, style = {}, draggable, onDragStart }: {
  children: ReactNode; style?: React.CSSProperties;
  draggable?: boolean; onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'var(--bg-surface)',border:`1px solid ${hovered?'rgba(255,255,255,0.14)':'var(--border-subtle)'}`,
        borderRadius:'var(--radius-md)',padding:14,
        transition:'border-color 0.15s,box-shadow 0.15s,transform 0.15s',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.2)',
        transform: hovered && draggable ? 'translateY(-2px) scale(1.01)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function DropZoneCard({ children, onDragOver, onDrop, active = false }: {
  children: ReactNode; onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void; active?: boolean;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        borderRadius:'var(--radius-md)',
        border:`1.5px dashed ${active?'var(--sky)':'rgba(14,165,233,0.2)'}`,
        background: active ? 'rgba(14,165,233,0.06)' : 'transparent',
        padding:14,transition:'border-color 0.2s,background 0.2s',
      }}
    >
      {children}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="slide-down" style={{
      display:'flex',alignItems:'center',gap:8,
      background:'var(--rose-dim)',border:'1px solid rgba(244,63,94,0.2)',
      borderRadius:'var(--radius-sm)',padding:'8px 12px',
      fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'var(--rose)',
    }}>
      <AlertTriangle size={13} strokeWidth={2}/> {message}
    </div>
  )
}

function StatPill({ icon: Icon, value, label, color = 'emerald' }: {
  icon: any; value: number | string; label: string; color?: 'emerald'|'sky'|'amber';
}) {
  const cols = { emerald:['var(--emerald)','var(--emerald-dim)'], sky:['var(--sky)','var(--sky-dim)'], amber:['var(--amber)','var(--amber-dim)'] }
  const [c, bg] = cols[color]
  return (
    <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:'var(--radius-md)',background:bg,border:`1px solid ${c}22` }}>
      <Icon size={14} color={c} strokeWidth={2}/>
      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:c,fontWeight:700 }}>{value}</span>
      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

function Divider() {
  return <div style={{ height:1,background:'var(--border-subtle)',margin:'4px 0' }}/>
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
  const [selectedCatalogEndpoint, setSelectedCatalogEndpoint] = useState<CatalogResourceEndpoint>(
    'catalog/locations',
  )
  const [selectedCatalogPage, setSelectedCatalogPage] = useState(1)

  const [cameras, setCameras] = useState<CameraBinding[]>(() => readStorage<CameraBinding[]>(CAMERAS_KEY, []))
  const [predictions, setPredictions] = useState<PredictionItem[]>(() => readStorage<PredictionItem[]>(PREDICTIONS_KEY, []))
  const [objectClasses, setObjectClasses] = useState<ObjectClassItem[]>(() => readStorage<ObjectClassItem[]>(OBJECT_CLASSES_KEY, []))
  const [aliasGroups, setAliasGroups] = useState<AliasGroup[]>(() => readStorage<AliasGroup[]>(ALIAS_GROUPS_KEY, []))
  const [uploadedYoloModels, setUploadedYoloModels] = useState<UploadedYoloModel[]>(() =>
    normalizeUploadedYoloModels(readStorage<UploadedYoloModel[]>(YOLO_UPLOADS_KEY, []))
  )

  const { data: dashboardData, error: dashboardError } = useDashboardQuery(token)
  const createLocationMutation = useCreateLocationMutation()
  const uploadImageProcessorModelMutation = useUploadImageProcessorModelMutation()
  const {
    data: catalogTableData,
    error: catalogTableError,
    isFetching: isCatalogTableFetching,
  } = useCatalogTableQuery(
    token,
    selectedCatalogEndpoint,
    selectedCatalogPage,
    CATALOG_PAGE_SIZE,
  )

  const modules = dashboardData?.modules ?? []
  const locationCount = dashboardData?.locationCount ?? 0
  const locations = dashboardData?.locations ?? EMPTY_LOCATIONS
  const loadError = dashboardError instanceof Error ? dashboardError.message : dashboardError === null ? '' : 'Unable to load dashboard data.'
  const selectedCatalogLabel = CATALOG_TABLES.find(
    (catalogTable) => catalogTable.endpoint === selectedCatalogEndpoint,
  )?.label
    ?? 'Catalog'
  const catalogTableRows = catalogTableData?.rows ?? EMPTY_CATALOG_ROWS
  const catalogTableColumns = useMemo(
    () => Array.from(new Set(catalogTableRows.flatMap((row) => Object.keys(row)))),
    [catalogTableRows],
  )
  const catalogTableErrorMessage = catalogTableError instanceof Error
    ? catalogTableError.message
    : catalogTableError === null
      ? ''
      : 'Unable to load catalog resources.'

  useEffect(() => { writeStorage(CAMERAS_KEY, cameras) }, [cameras])
  useEffect(() => { writeStorage(PREDICTIONS_KEY, predictions) }, [predictions])
  useEffect(() => { writeStorage(OBJECT_CLASSES_KEY, objectClasses) }, [objectClasses])
  useEffect(() => { writeStorage(ALIAS_GROUPS_KEY, aliasGroups) }, [aliasGroups])
  useEffect(() => { writeStorage(YOLO_UPLOADS_KEY, uploadedYoloModels) }, [uploadedYoloModels])

  const effectiveSelectedLocationId = selectedLocationId ?? locations[0]?.id ?? null
  const selectedLocation = useMemo(() => locations.find((l) => l.id === effectiveSelectedLocationId) ?? null, [effectiveSelectedLocationId, locations])
  const selectedLocationCameras = useMemo(() => cameras.filter((c) => c.locationId === effectiveSelectedLocationId), [cameras, effectiveSelectedLocationId])
  const groupedAliases = useMemo(() => aliasGroups.reduce<Record<string, AliasGroup[]>>((acc, ag) => {
    if (!(ag.canonicalClass in acc)) acc[ag.canonicalClass] = []
    acc[ag.canonicalClass].push(ag)
    return acc
  }, {}), [aliasGroups])

  // ── Handlers ─────────────────────────────────────────────────────────────────

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
        vendor: cameraVendor || null, model: cameraModel || null,
        resolution: cameraResolution || null, fps: cameraFps === '' ? null : Number(cameraFps),
        fieldOfView: cameraFov || null,
      }
      const yoloMeta = {
        modelName: modelName || null, modelVersion: modelVersion || null,
        confidenceThreshold: confidenceThreshold === '' ? null : Number(confidenceThreshold),
        iouThreshold: iouThreshold === '' ? null : Number(iouThreshold),
      }
      await createLocationMutation.mutateAsync({
        token,
        payload: {
          locationName, descriptiveLocation,
          cameraIdentifier: cameraIdentifier || null, liveFeedUrl: liveFeedUrl || null,
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
    setCameraName(''); setCameraFeedUrl(''); setCameraYoloModelName(''); setCameraYoloModelVersion(''); setCameraFormError('')
  }

  const onCreatePrediction = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (predictionCameraId === '') { setPredictionFormError('Select a camera.'); return }
    if (predictionObjectClass.trim() === '') { setPredictionFormError('Object class required.'); return }
    const conf = Number(predictionConfidence)
    if (Number.isNaN(conf) || conf < 0 || conf > 1) { setPredictionFormError('Confidence must be between 0 and 1.'); return }
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
    if (objectClasses.some((c) => c.name.toLowerCase() === norm)) { setClassFormError('Class already exists.'); return }
    setObjectClasses((cur) => [{ id: makeId(), name: className.trim() }, ...cur])
    setClassName(''); setClassFormError('')
  }

  const onCreateAliasGroup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!aliasName.trim() || !aliasCanonicalClass.trim()) { setAliasFormError('Alias and canonical class are required.'); return }
    setAliasGroups((cur) => [{
      id: makeId(), alias: aliasName.trim(), canonicalClass: aliasCanonicalClass.trim(), context: aliasContext.trim(),
    }, ...cur])
    setAliasName(''); setAliasCanonicalClass(''); setAliasContext(''); setAliasFormError('')
  }

  const onAttachUpload = (e: FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file) return

    const dot = file.name.lastIndexOf('.')
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : ''
    if (!ALLOWED_MODEL_EXTENSIONS.includes(ext)) {
      setUploadError(`Invalid extension. Allowed: ${ALLOWED_MODEL_EXTENSIONS.join(', ')}`)
      input.value = ''
      return
    }
    if (file.size > MAX_MODEL_SIZE_BYTES) {
      setUploadError('File exceeds 100MB limit.')
      input.value = ''
      return
    }
    if (!token) {
      setUploadError('Please login first.')
      input.value = ''
      return
    }

    void (async () => {
      try {
        const uploadedModel = await uploadImageProcessorModelMutation.mutateAsync({
          token,
          file,
        })
        setUploadedYoloModels((cur) => [uploadedModel, ...cur])
        setUploadError('')
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Model upload failed.')
      } finally {
        input.value = ''
      }
    })()
  }

  const onDragCamera = (e: DragEvent<HTMLElement>, cameraId: string) => e.dataTransfer.setData('text/plain', cameraId)
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
  const onLogout = () => { localStorage.removeItem(TOKEN_KEY); setToken(null); setLocationFormError('') }

  // ── Auth Screen ───────────────────────────────────────────────────────────────

  if (token === null) {
    return (
      <>
        <style>{css}</style>
        <main style={{
          minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px',
          background:'radial-gradient(ellipse at 30% 20%,rgba(16,185,129,0.08) 0%,transparent 50%), radial-gradient(ellipse at 80% 80%,rgba(14,165,233,0.08) 0%,transparent 50%), var(--bg-base)',
        }}>
          {/* Grid bg */}
          <div style={{
            position:'fixed',inset:0,pointerEvents:'none',
            backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
            backgroundSize:'48px 48px',
          }}/>
          <div className="fade-up" style={{ width:'100%',maxWidth:400,position:'relative' }}>
            <Panel>
              <ScanLine/>
              {/* Logo */}
              <div style={{ textAlign:'center',marginBottom:28 }}>
                <div style={{
                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                  width:52,height:52,borderRadius:14,marginBottom:14,
                  background:'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05))',
                  border:'1px solid rgba(16,185,129,0.3)',
                  boxShadow:'0 0 32px rgba(16,185,129,0.15)',
                }}>
                  <Shield size={24} color='var(--emerald)' strokeWidth={1.5}/>
                </div>
                <h1 style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:15,fontWeight:700,letterSpacing:'0.1em',color:'var(--text-primary)',margin:'0 0 6px' }}>
                  GEOSPATIAL AI
                </h1>
                <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-muted)',margin:0 }}>
                  Secure access · Single-user portal
                </p>
              </div>

              <form onSubmit={onLogin} style={{ display:'grid',gap:14 }}>
                <FieldGuide label="Username" icon={Hash} hint="Your assigned system username" required>
                  <Input
                    value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin" required autoComplete="username"
                  />
                </FieldGuide>
                <FieldGuide label="Password" icon={Shield} hint="Minimum 4 characters required" required>
                  <Input
                    type="password" value={password} minLength={4}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="········" required autoComplete="current-password"
                  />
                </FieldGuide>
                {loginError && <ErrorBanner message={loginError}/>}
                <Btn type="submit" disabled={isAuthenticating} icon={LogIn} fullWidth>
                  {isAuthenticating ? 'Authenticating...' : 'Sign In'}
                </Btn>
              </form>
            </Panel>
          </div>
        </main>
      </>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  const gridAuto = (min = 220) => ({ display:'grid', gap:12, gridTemplateColumns:`repeat(auto-fill,minmax(${min}px,1fr))` })
  const formatCatalogCellValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '—'
    }

    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    return String(value)
  }

  return (
    <>
      <style>{css}</style>
      {/* Page bg */}
      <div style={{
        position:'fixed',inset:0,pointerEvents:'none',zIndex:0,
        background:'radial-gradient(ellipse at 20% 0%,rgba(16,185,129,0.06) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(14,165,233,0.06) 0%,transparent 50%),var(--bg-base)',
      }}>
        <div style={{
          position:'absolute',inset:0,
          backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)',
          backgroundSize:'48px 48px',
        }}/>
      </div>

      <main style={{ position:'relative',zIndex:1,maxWidth:1440,margin:'0 auto',padding:'24px 20px 48px',display:'grid',gap:16 }} className="fade-in">

        {/* ── Header ── */}
        <Panel style={{ padding:0 }}>
          <div style={{
            position:'absolute',inset:0,borderRadius:'inherit',
            background:'linear-gradient(90deg,rgba(16,185,129,0.05),transparent 60%,rgba(14,165,233,0.08))',
          }}/>
          <ScanLine/>
          <div style={{ position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:'16px 24px',flexWrap:'wrap' }}>
            <div style={{ display:'flex',alignItems:'center',gap:14 }}>
              <div style={{
                display:'flex',alignItems:'center',justifyContent:'center',
                width:40,height:40,borderRadius:10,
                background:'var(--emerald-dim)',border:'1px solid rgba(16,185,129,0.25)',
              }}>
                <Shield size={18} color='var(--emerald)' strokeWidth={1.5}/>
              </div>
              <div>
                <h1 style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--text-primary)',margin:0 }}>
                  Geospatial Security Dashboard
                </h1>
                <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:4 }}>
                  <LiveDot color="emerald"/><span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'var(--text-muted)' }}>System online</span>
                </div>
              </div>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
              <StatPill icon={MapPin} value={locationCount} label="locations" color="emerald"/>
              <StatPill icon={Camera} value={cameras.length} label="cameras" color="sky"/>
              <StatPill icon={Activity} value={predictions.length} label="predictions" color="amber"/>
              <Btn variant="ghost" icon={LogOut} onClick={onLogout} size="sm">Sign Out</Btn>
            </div>
          </div>
        </Panel>

        {loadError && <ErrorBanner message={loadError}/>}

        {/* ── Platform Modules ── */}
        {modules.length > 0 && (
          <Panel className="fade-up stagger-1">
            <SectionTitle icon={LayoutGrid} badge={modules.length}>Platform Modules</SectionTitle>
            <div style={gridAuto(200)}>
              {modules.map((module) => (
                <Card key={module.slug}>
                  <div style={{ display:'flex',alignItems:'flex-start',gap:10 }}>
                    <Cpu size={14} color='var(--sky)' strokeWidth={1.5} style={{ flexShrink:0,marginTop:2 }}/>
                    <div>
                      <h3 style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,color:'var(--sky)',margin:'0 0 4px' }}>{module.title}</h3>
                      <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:12,color:'var(--text-muted)',margin:0,lineHeight:1.5 }}>{module.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Panel>
        )}

        <Panel>
          <SectionTitle icon={Database} badge={selectedCatalogLabel}>Catalog Resource Browser</SectionTitle>

          <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:14 }}>
            <div style={{ minWidth:280,flex:'1 1 360px' }}>
              <FieldGuide label="Catalog Resource" icon={Layers} hint="Switch between API catalog resources">
                <Select
                  value={selectedCatalogEndpoint}
                  onChange={(event) => {
                    setSelectedCatalogEndpoint(event.target.value as CatalogResourceEndpoint)
                    setSelectedCatalogPage(1)
                  }}
                >
                  {CATALOG_TABLES.map((catalogTable) => (
                    <option key={catalogTable.endpoint} value={catalogTable.endpoint}>
                      {catalogTable.label}
                    </option>
                  ))}
                </Select>
              </FieldGuide>
            </div>
            {catalogTableData && (
              <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                <Badge variant="default">{catalogTableData.total} total</Badge>
                <Badge variant="default">
                  page {catalogTableData.currentPage} of {catalogTableData.lastPage}
                </Badge>
                <Badge variant="default">{catalogTableData.perPage} per page</Badge>
              </div>
            )}
          </div>

          {catalogTableErrorMessage && <ErrorBanner message={catalogTableErrorMessage}/>}

          <div style={{
            overflowX:'auto',
            border:'1px solid var(--border-subtle)',
            borderRadius:'var(--radius-md)',
            background:'var(--bg-surface)',
          }}>
            {catalogTableColumns.length === 0 ? (
              <div style={{ padding:'24px',textAlign:'center' }}>
                <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'var(--text-hint)',margin:0 }}>
                  {isCatalogTableFetching ? 'Loading catalog data...' : 'No records available for this resource.'}
                </p>
              </div>
            ) : (
              <table style={{ width:'100%',borderCollapse:'collapse',minWidth:960 }}>
                <thead>
                <tr>
                  {catalogTableColumns.map((column) => (
                    <th
                      key={column}
                      style={{
                        textAlign:'left',
                        padding:'10px 12px',
                        borderBottom:'1px solid var(--border-subtle)',
                        fontFamily:"'JetBrains Mono',monospace",
                        fontSize:10,
                        textTransform:'uppercase',
                        letterSpacing:'0.1em',
                        color:'var(--text-secondary)',
                        position:'sticky',
                        top:0,
                        background:'var(--bg-surface)',
                        zIndex:1,
                      }}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
                </thead>
                <tbody>
                {catalogTableRows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {catalogTableColumns.map((column) => (
                      <td
                        key={`${rowIndex}-${column}`}
                        style={{
                          padding:'10px 12px',
                          borderBottom:'1px solid var(--border-subtle)',
                          fontFamily:"'JetBrains Mono',monospace",
                          fontSize:11,
                          color:'var(--text-primary)',
                          verticalAlign:'top',
                          maxWidth:280,
                          wordBreak:'break-word',
                          background: rowIndex % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        }}
                      >
                        {formatCatalogCellValue(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
                </tbody>
              </table>
            )}
          </div>

          {catalogTableData && catalogTableData.lastPage > 1 && (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:12,flexWrap:'wrap' }}>
              <p style={{ margin:0,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-hint)' }}>
                Showing page {catalogTableData.currentPage} of {catalogTableData.lastPage}
              </p>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <Btn
                  variant="ghost"
                  size="sm"
                  disabled={catalogTableData.currentPage <= 1 || isCatalogTableFetching}
                  onClick={() => setSelectedCatalogPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Btn>
                <Btn
                  variant="ghost"
                  size="sm"
                  disabled={catalogTableData.currentPage >= catalogTableData.lastPage || isCatalogTableFetching}
                  onClick={() => setSelectedCatalogPage((current) => Math.min(catalogTableData.lastPage, current + 1))}
                >
                  Next
                </Btn>
              </div>
            </div>
          )}
        </Panel>

        {/* ── Create Location ── */}
        <Panel className="fade-up stagger-2">
          <SectionTitle icon={MapPin}>Create Camera Placement Location</SectionTitle>

          {/* Helper callout */}
          <div style={{
            display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',borderRadius:'var(--radius-sm)',
            background:'rgba(14,165,233,0.06)',border:'1px solid rgba(14,165,233,0.15)',marginBottom:18,
          }}>
            <Info size={13} color='var(--sky)' style={{ flexShrink:0,marginTop:1 }}/>
            <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:12,color:'var(--text-secondary)',margin:0,lineHeight:1.6 }}>
              Define a physical placement point for a CCTV camera. Fields marked <span style={{ color:'var(--rose)' }}>*</span> are required.
              Camera spec and YOLO metadata are optional but recommended for analytics.
            </p>
          </div>

          <form onSubmit={onCreateLocation} style={{ display:'grid',gap:12,gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))' }}>
            {/* Core identity */}
            <FieldGuide label="Location Name" icon={MapPin} hint="Unique name for this placement point" required>
              <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="e.g. Gate A — North Entrance" required/>
            </FieldGuide>
            <FieldGuide label="Camera Identifier" icon={Hash} hint="Optional hardware serial or asset tag">
              <Input value={cameraIdentifier} onChange={(e) => setCameraIdentifier(e.target.value)} placeholder="e.g. CAM-0042"/>
            </FieldGuide>
            <FieldGuide label="Live Feed URL" icon={Wifi} hint="RTSP or HTTP stream URL for this camera">
              <Input value={liveFeedUrl} type="url" onChange={(e) => setLiveFeedUrl(e.target.value)} placeholder="rtsp://192.168.1.x:554/stream"/>
            </FieldGuide>

            {/* Descriptive placement spans full width */}
            <div style={{ gridColumn:'1 / -1' }}>
              <FieldGuide label="Descriptive Placement" icon={Eye} hint="Describe exactly where the camera is mounted and what it covers" required>
                <Textarea
                  value={descriptiveLocation} rows={3}
                  onChange={(e) => setDescriptiveLocation(e.target.value)}
                  placeholder="e.g. Mounted 4m high on the northeast corner of Building B facing the parking entrance. Covers 120° arc including vehicle entry lane."
                  required
                />
              </FieldGuide>
            </div>

            {/* Separator label */}
            <div style={{ gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:8,marginTop:4 }}>
              <Camera size={11} color='var(--text-muted)'/>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.1em' }}>Camera Hardware Spec</span>
              <div style={{ flex:1,height:1,background:'var(--border-subtle)' }}/>
            </div>

            <FieldGuide label="Camera Vendor" icon={Box} hint="Manufacturer name (e.g. Hikvision, Dahua, Axis)">
              <Input value={cameraVendor} onChange={(e) => setCameraVendor(e.target.value)} placeholder="e.g. Hikvision"/>
            </FieldGuide>
            <FieldGuide label="Camera Model" icon={Settings2} hint="Exact model number from manufacturer">
              <Input value={cameraModel} onChange={(e) => setCameraModel(e.target.value)} placeholder="e.g. DS-2CD2183G2-I"/>
            </FieldGuide>
            <FieldGuide label="Resolution" icon={Maximize2} hint="Width × Height in pixels">
              <Input value={cameraResolution} onChange={(e) => setCameraResolution(e.target.value)} placeholder="e.g. 3840×2160"/>
            </FieldGuide>
            <FieldGuide label="Frame Rate (FPS)" icon={Zap} hint="Frames per second — between 1 and 240">
              <Input value={cameraFps} type="number" min={1} max={240} onChange={(e) => setCameraFps(e.target.value)} placeholder="e.g. 30"/>
            </FieldGuide>
            <FieldGuide label="Field of View" icon={ScanIcon} hint="Horizontal angle covered by the lens">
              <Input value={cameraFov} onChange={(e) => setCameraFov(e.target.value)} placeholder="e.g. 104°"/>
            </FieldGuide>

            {/* YOLO separator */}
            <div style={{ gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:8,marginTop:4 }}>
              <Cpu size={11} color='var(--text-muted)'/>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.1em' }}>YOLO Model Metadata</span>
              <div style={{ flex:1,height:1,background:'var(--border-subtle)' }}/>
            </div>

            <FieldGuide label="YOLO Model Name" icon={Cpu} hint="Name of the detection model deployed at this location">
              <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="e.g. yolov8x-seg"/>
            </FieldGuide>
            <FieldGuide label="YOLO Model Version" icon={Tag} hint="Semantic version of the model weights">
              <Input value={modelVersion} onChange={(e) => setModelVersion(e.target.value)} placeholder="e.g. 1.3.0"/>
            </FieldGuide>
            <FieldGuide label="Confidence Threshold" icon={BarChart2} hint="Min confidence score to log a detection (0.0 – 1.0)">
              <Input value={confidenceThreshold} type="number" min={0} max={1} step="0.01" onChange={(e) => setConfidenceThreshold(e.target.value)} placeholder="e.g. 0.65"/>
            </FieldGuide>
            <FieldGuide label="IoU Threshold" icon={Crosshair} hint="Non-max suppression overlap threshold (0.0 – 1.0)">
              <Input value={iouThreshold} type="number" min={0} max={1} step="0.01" onChange={(e) => setIouThreshold(e.target.value)} placeholder="e.g. 0.45"/>
            </FieldGuide>

            {/* GPS separator */}
            <div style={{ gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:8,marginTop:4 }}>
              <Globe size={11} color='var(--text-muted)'/>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.1em' }}>GPS Coordinates</span>
              <div style={{ flex:1,height:1,background:'var(--border-subtle)' }}/>
            </div>

            <FieldGuide label="Latitude" icon={Globe} hint="WGS84 decimal degrees — range: −90 to 90">
              <Input value={latitude} type="number" step="0.0000001" min={-90} max={90} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 10.7202"/>
            </FieldGuide>
            <FieldGuide label="Longitude" icon={Globe} hint="WGS84 decimal degrees — range: −180 to 180">
              <Input value={longitude} type="number" step="0.0000001" min={-180} max={180} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 122.5621"/>
            </FieldGuide>

            <div style={{ gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:10,marginTop:4 }}>
              <Btn type="submit" icon={Plus}>Save Location</Btn>
              {createLocationMutation.isSuccess && (
                <span style={{ display:'flex',alignItems:'center',gap:5,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--emerald)' }} className="slide-down">
                  <CheckCircle2 size={12}/> Saved successfully
                </span>
              )}
            </div>
            {locationFormError && <div style={{ gridColumn:'1 / -1' }}><ErrorBanner message={locationFormError}/></div>}
          </form>
        </Panel>

        {/* ── CCTV Attachment Board ── */}
        <Panel className="fade-up stagger-3">
          <SectionTitle icon={Move}>CCTV Attachment Board</SectionTitle>

          <div style={{
            display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',borderRadius:'var(--radius-sm)',
            background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)',marginBottom:18,
          }}>
            <GripVertical size={13} color='var(--amber)' style={{ flexShrink:0,marginTop:1 }}/>
            <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:12,color:'var(--text-secondary)',margin:0,lineHeight:1.6 }}>
              Drag a camera card from <strong style={{ color:'var(--text-primary)' }}>Unassigned</strong> and drop it into a location zone below.
              Drag back to Unassigned to detach. You can also add new cameras to inventory first.
            </p>
          </div>

          <div style={{ display:'grid',gap:12,gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))' }}>
            {/* Unassigned pool */}
            <DropZoneCard onDragOver={(e) => e.preventDefault()} onDrop={onDropCameraToUnassigned}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
                <Camera size={13} color='var(--text-muted)'/>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-muted)' }}>Unassigned Cameras</span>
                <Badge variant="default">{cameras.filter(c => c.locationId === null).length}</Badge>
              </div>
              <div style={{ display:'grid',gap:8,gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))' }}>
                {cameras.filter(c => c.locationId === null).map((camera) => (
                  <Card key={camera.id} draggable onDragStart={(e) => onDragCamera(e as any, camera.id)}>
                    <div style={{ display:'flex',alignItems:'flex-start',gap:6 }}>
                      <GripVertical size={11} color='var(--text-hint)' style={{ flexShrink:0,marginTop:1 }}/>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,color:'var(--text-primary)',margin:'0 0 3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{camera.name}</p>
                        <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'var(--text-muted)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{camera.liveFeedUrl || 'No feed URL'}</p>
                        {camera.yoloModelName && (
                          <Badge variant="sky" style={{ marginTop:4 }}>{camera.yoloModelName}</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {cameras.every(c => c.locationId !== null) && (
                  <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-hint)',padding:'8px 4px' }}>All cameras are assigned.</p>
                )}
              </div>
            </DropZoneCard>

            {/* Add camera form */}
            <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-md)',padding:16 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
                <Plus size={13} color='var(--emerald)'/>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-secondary)' }}>Add Camera to Inventory</span>
              </div>
              <form style={{ display:'grid',gap:10 }} onSubmit={onCreateCamera}>
                <FieldGuide label="Camera Name" icon={Camera} hint="A recognizable label for this camera unit" required>
                  <Input value={cameraName} onChange={(e) => setCameraName(e.target.value)} placeholder="e.g. Cam-North-01" required/>
                </FieldGuide>
                <FieldGuide label="Live Feed URL" icon={Wifi} hint="RTSP / HTTP stream endpoint">
                  <Input value={cameraFeedUrl} type="url" onChange={(e) => setCameraFeedUrl(e.target.value)} placeholder="rtsp://..."/>
                </FieldGuide>
                <FieldGuide label="YOLO Model Name" icon={Cpu} hint="Model deployed on this camera's edge device">
                  <Input value={cameraYoloModelName} onChange={(e) => setCameraYoloModelName(e.target.value)} placeholder="e.g. yolov8n"/>
                </FieldGuide>
                <FieldGuide label="Model Version" icon={Tag} hint="Version tag for tracking weight files">
                  <Input value={cameraYoloModelVersion} onChange={(e) => setCameraYoloModelVersion(e.target.value)} placeholder="e.g. 2.1.0"/>
                </FieldGuide>
                <Btn type="submit" icon={Plus}>Add Camera</Btn>
                {cameraFormError && <ErrorBanner message={cameraFormError}/>}
              </form>
            </div>
          </div>

          {/* Location drop targets */}
          {locations.length > 0 && (
            <div style={{ marginTop:14 }}>
              <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-hint)',marginBottom:10 }}>
                Drop zones — drag cameras here to attach
              </p>
              <div style={gridAuto(200)}>
                {locations.map((loc) => {
                  const count = cameras.filter(c => c.locationId === loc.id).length
                  return (
                    <DropZoneCard
                      key={loc.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropCameraToLocation(e as any, loc.id)}
                    >
                      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6,marginBottom:4 }}>
                        <h3 style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,color:'var(--emerald)',margin:0 }}>{loc.locationName}</h3>
                        <Badge variant={count > 0 ? 'sky' : 'default'}>{count} cam{count !== 1 ? 's' : ''}</Badge>
                      </div>
                      <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:11,color:'var(--text-muted)',margin:'0 0 6px',lineHeight:1.5 }}>{loc.descriptiveLocation}</p>
                      {(loc.latitude != null || loc.longitude != null) && (
                        <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                          <Globe size={9} color='var(--text-hint)'/>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'var(--text-hint)' }}>
                            {loc.latitude ?? '–'}, {loc.longitude ?? '–'}
                          </span>
                        </div>
                      )}
                    </DropZoneCard>
                  )
                })}
              </div>
            </div>
          )}
        </Panel>

        {/* ── Location Viewer ── */}
        <Panel className="fade-up stagger-4">
          <SectionTitle icon={Eye}>Location Viewer</SectionTitle>
          <div style={{ marginBottom:14 }}>
            <FieldGuide label="Select Location" icon={MapPin} hint="Choose a location to inspect its attached cameras and YOLO config">
              <Select
                value={effectiveSelectedLocationId ?? ''}
                onChange={(e) => setSelectedLocationId(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">— choose a location —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.locationName}</option>
                ))}
              </Select>
            </FieldGuide>
          </div>
          {selectedLocation === null ? (
            <div style={{ padding:'24px',textAlign:'center' }}>
              <MapPin size={24} color='var(--text-hint)' style={{ margin:'0 auto 8px' }}/>
              <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'var(--text-hint)',margin:0 }}>No location selected.</p>
            </div>
          ) : (
            <div style={gridAuto()}>
              <Card style={{ borderColor:'rgba(16,185,129,0.2)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
                  <MapPin size={13} color='var(--emerald)'/><h3 style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:'var(--emerald)',margin:0 }}>{selectedLocation.locationName}</h3>
                </div>
                <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:12,color:'var(--text-secondary)',margin:'0 0 8px',lineHeight:1.5 }}>{selectedLocation.descriptiveLocation}</p>
                {(selectedLocation.latitude != null || selectedLocation.longitude != null) && (
                  <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                    <Globe size={10} color='var(--text-muted)'/><span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-muted)' }}>{selectedLocation.latitude ?? '–'}, {selectedLocation.longitude ?? '–'}</span>
                  </div>
                )}
              </Card>
              {selectedLocationCameras.length === 0 ? (
                <Card>
                  <div style={{ textAlign:'center',padding:'12px 0' }}>
                    <Camera size={20} color='var(--text-hint)' style={{ margin:'0 auto 8px' }}/>
                    <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-hint)',margin:0 }}>No CCTV attached yet.</p>
                  </div>
                </Card>
              ) : selectedLocationCameras.map((cam) => (
                <Card key={cam.id}>
                  <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:6 }}>
                    <LiveDot color="sky"/>
                    <h3 style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,color:'var(--sky)',margin:0 }}>{cam.name}</h3>
                  </div>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-muted)',margin:'0 0 4px',display:'flex',alignItems:'center',gap:4 }}>
                    <Wifi size={9}/> {cam.liveFeedUrl || 'No feed URL'}
                  </p>
                  {cam.yoloModelName && (
                    <div style={{ display:'flex',gap:4,marginTop:6,flexWrap:'wrap' }}>
                      <Badge variant="emerald">{cam.yoloModelName}</Badge>
                      {cam.yoloModelVersion && <Badge variant="default">v{cam.yoloModelVersion}</Badge>}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Panel>

        {/* ── Predictions ── */}
        <Panel className="fade-up stagger-5">
          <SectionTitle icon={Activity} badge={predictions.length}>Predictions Module</SectionTitle>

          <div style={{
            display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',borderRadius:'var(--radius-sm)',
            background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.12)',marginBottom:18,
          }}>
            <Activity size={13} color='var(--emerald)' style={{ flexShrink:0,marginTop:1 }}/>
            <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:12,color:'var(--text-secondary)',margin:0,lineHeight:1.6 }}>
              Log a detection event from any camera. Select a camera, enter the detected object class (or pick from saved classes), and set the model's confidence score.
            </p>
          </div>

          <form onSubmit={onCreatePrediction} style={{ display:'grid',gap:12,gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))' }}>
            <FieldGuide label="Camera Source" icon={Camera} hint="Which camera generated this detection" required>
              <Select value={predictionCameraId} onChange={(e) => setPredictionCameraId(e.target.value)} required>
                <option value="">— select camera —</option>
                {cameras.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FieldGuide>
            <FieldGuide label="Object Class" icon={Tag} hint="Type of object detected — use saved classes for consistency" required>
              <Input list="known-classes" value={predictionObjectClass} onChange={(e) => setPredictionObjectClass(e.target.value)} placeholder="e.g. person, vehicle, backpack" required/>
              <datalist id="known-classes">{objectClasses.map((c) => <option key={c.id} value={c.name}/>)}</datalist>
            </FieldGuide>
            <FieldGuide label="Confidence Score" icon={BarChart2} hint="Model certainty — decimal between 0.00 and 1.00" required>
              <Input value={predictionConfidence} type="number" min={0} max={1} step="0.01" required onChange={(e) => setPredictionConfidence(e.target.value)} placeholder="e.g. 0.87"/>
            </FieldGuide>
            <div style={{ gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:10 }}>
              <Btn type="submit" icon={Plus}>Log Prediction</Btn>
            </div>
            {predictionFormError && <div style={{ gridColumn:'1 / -1' }}><ErrorBanner message={predictionFormError}/></div>}
          </form>

          <div style={{ height:1,background:'var(--border-subtle)',margin:'18px 0'}}/>

          {predictions.length === 0 ? (
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-hint)',textAlign:'center',padding:'16px 0' }}>No predictions logged yet.</p>
          ) : (
            <div style={gridAuto()}>
              {predictions.map((p) => {
                const cam = cameras.find((c) => c.id === p.cameraId)
                const loc = locations.find((l) => l.id === p.locationId)
                const confPct = (p.confidence * 100).toFixed(1)
                const confColor = p.confidence >= 0.8 ? 'emerald' : p.confidence >= 0.5 ? 'amber' : 'rose'
                return (
                  <Card key={p.id}>
                    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6,marginBottom:8 }}>
                      <h3 style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700,color:'var(--amber)',margin:0 }}>{p.objectClass}</h3>
                      <Badge variant={confColor}>{confPct}%</Badge>
                    </div>
                    <div style={{ display:'grid',gap:4 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                        <Camera size={9} color='var(--text-hint)'/>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-secondary)' }}>{cam?.name ?? 'Unknown camera'}</span>
                      </div>
                      <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                        <MapPin size={9} color='var(--text-hint)'/>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-secondary)' }}>{loc?.locationName ?? 'Unassigned'}</span>
                      </div>
                      <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                        <Clock size={9} color='var(--text-hint)'/>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'var(--text-muted)' }}>{new Date(p.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    {/* Confidence bar */}
                    <div style={{ marginTop:10,height:3,borderRadius:99,background:'var(--border-subtle)',overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${p.confidence*100}%`,borderRadius:99,background:p.confidence>=0.8?'var(--emerald)':p.confidence>=0.5?'var(--amber)':'var(--rose)',transition:'width 0.4s ease' }}/>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </Panel>

        {/* ── Object Classes + Alias Grouping ── */}
        <Panel>
          <SectionTitle icon={Layers}>Object Classes & Alias Groups</SectionTitle>
          <div style={{ display:'grid',gap:16,gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))' }}>

            {/* Object Classes */}
            <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-md)',padding:16 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
                <Tag size={13} color='var(--sky)'/>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-secondary)' }}>Object Classes</span>
                <Badge variant="sky">{objectClasses.length}</Badge>
              </div>
              <form style={{ display:'grid',gap:10 }} onSubmit={onCreateObjectClass}>
                <FieldGuide label="Class Name" icon={Tag} hint="Canonical label used across all predictions (e.g. 'person')" required>
                  <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. person, vehicle, bag" required/>
                </FieldGuide>
                <Btn type="submit" icon={Plus}>Add Class</Btn>
                {classFormError && <ErrorBanner message={classFormError}/>}
              </form>
              {objectClasses.length > 0 && (
                <div style={{ marginTop:14,display:'flex',flexWrap:'wrap',gap:6 }}>
                  {objectClasses.map((c) => <Badge key={c.id} variant="sky">{c.name}</Badge>)}
                </div>
              )}
            </div>

            {/* Alias Groups */}
            <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-md)',padding:16 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
                <Link2 size={13} color='var(--emerald)'/>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-secondary)' }}>Alias Groups</span>
                <Badge variant="emerald">{aliasGroups.length}</Badge>
              </div>
              <div style={{
                padding:'8px 12px',borderRadius:'var(--radius-sm)',
                background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.12)',marginBottom:12,
              }}>
                <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:11,color:'var(--text-secondary)',margin:0,lineHeight:1.5 }}>
                  Map alternate terms (aliases) to a canonical class. Useful when different models output different label names for the same object.
                </p>
              </div>
              <form style={{ display:'grid',gap:10 }} onSubmit={onCreateAliasGroup}>
                <FieldGuide label="Alias" icon={Tag} hint="The alternate label name (as output by the model)" required>
                  <Input value={aliasName} onChange={(e) => setAliasName(e.target.value)} placeholder="e.g. pedestrian, human, man" required/>
                </FieldGuide>
                <FieldGuide label="Canonical Class" icon={CheckCircle2} hint="The standardised class this alias maps to" required>
                  <Input list="canonical-classes" value={aliasCanonicalClass} onChange={(e) => setAliasCanonicalClass(e.target.value)} placeholder="e.g. person" required/>
                  <datalist id="canonical-classes">{objectClasses.map((c) => <option key={c.id} value={c.name}/>)}</datalist>
                </FieldGuide>
                <FieldGuide label="Context" icon={Info} hint="Optional scope where this alias applies">
                  <Input value={aliasContext} onChange={(e) => setAliasContext(e.target.value)} placeholder="e.g. perimeter zone, parking lot"/>
                </FieldGuide>
                <Btn type="submit" icon={Plus}>Add Alias Group</Btn>
                {aliasFormError && <ErrorBanner message={aliasFormError}/>}
              </form>
              {Object.entries(groupedAliases).length > 0 && (
                <div style={{ marginTop:14,display:'grid',gap:8 }}>
                  {Object.entries(groupedAliases).map(([canon, aliases]) => (
                    <Card key={canon}>
                      <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:6 }}>
                        <CheckCircle2 size={10} color='var(--emerald)'/>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:'var(--emerald)' }}>{canon}</span>
                      </div>
                      <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                        {aliases.map((a) => (
                          <span key={a.id} style={{
                            fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'var(--text-secondary)',
                            background:'rgba(255,255,255,0.04)',border:'1px solid var(--border-subtle)',borderRadius:4,padding:'2px 6px',
                          }}>
                            {a.alias}{a.context ? ` · ${a.context}` : ''}
                          </span>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* ── YOLO Model Uploads ── */}
        <Panel>
          <SectionTitle icon={Database} badge={uploadedYoloModels.length}>YOLO Model Uploads</SectionTitle>

          <div style={{
            display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',borderRadius:'var(--radius-sm)',
            background:'rgba(14,165,233,0.05)',border:'1px solid rgba(14,165,233,0.12)',marginBottom:16,
          }}>
            <FileCode2 size={13} color='var(--sky)' style={{ flexShrink:0,marginTop:1 }}/>
            <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:12,color:'var(--text-secondary)',margin:0,lineHeight:1.6 }}>
              Upload model weight files for deployment. Supported formats: <strong style={{ color:'var(--text-primary)',fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>{ALLOWED_MODEL_EXTENSIONS.join('  ')}</strong> · Max size: <strong style={{ color:'var(--text-primary)' }}>100 MB</strong>
            </p>
          </div>

          <label style={{
            display:'inline-flex',alignItems:'center',gap:10,cursor:'pointer',
            padding:'12px 20px',borderRadius:'var(--radius-md)',
            border:'1.5px dashed rgba(14,165,233,0.3)',background:'rgba(14,165,233,0.04)',
            fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'var(--sky)',
            transition:'border-color 0.15s,background 0.15s',
          }}
                 onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor='rgba(14,165,233,0.6)'; (e.currentTarget as HTMLElement).style.background='rgba(14,165,233,0.08)' }}
                 onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor='rgba(14,165,233,0.3)'; (e.currentTarget as HTMLElement).style.background='rgba(14,165,233,0.04)' }}
          >
            <Upload size={15} strokeWidth={1.5}/>
            <span>{uploadImageProcessorModelMutation.isPending ? 'Uploading model…' : 'Choose model file to upload'}</span>
            <input type="file" accept={ALLOWED_MODEL_EXTENSIONS.join(',')} onInput={onAttachUpload} style={{ display:'none' }}/>
          </label>

          {uploadError && <div style={{ marginTop:10 }}><ErrorBanner message={uploadError}/></div>}

          {uploadedYoloModels.length > 0 && (
            <div style={{ ...gridAuto(),marginTop:16 }}>
              {uploadedYoloModels.map((u) => (
                <Card key={u.id}>
                  <div style={{ display:'flex',alignItems:'flex-start',gap:8 }}>
                    <FileCode2 size={14} color='var(--sky)' style={{ flexShrink:0,marginTop:1 }}/>
                    <div>
                      <h3 style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,color:'var(--text-primary)',margin:'0 0 6px',wordBreak:'break-all' }}>{u.fileName}</h3>
                      <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                        <Badge variant="sky">{u.extension}</Badge>
                        <Badge variant="default">{(u.sizeBytes / (1024 * 1024)).toFixed(2)} MB</Badge>
                      </div>
                      <div style={{ display:'flex',alignItems:'center',gap:5,marginTop:8 }}>
                        <Clock size={9} color='var(--text-hint)'/>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'var(--text-hint)' }}>{new Date(u.uploadedAt).toLocaleString()}</span>
                      </div>
                      {u.modelPath && (
                        <div style={{ marginTop:6 }}>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'var(--text-secondary)',wordBreak:'break-all' }}>
                            {u.modelPath}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {uploadedYoloModels.length === 0 && (
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text-hint)',textAlign:'center',padding:'16px 0',marginTop:8 }}>No model files uploaded yet.</p>
          )}
        </Panel>

      </main>
    </>
  )
}

export default App
