import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type LoginResponse = {
  data: {
    token: string
    user: {
      id: number
      username: string
      email: string
    }
  }
}

type Module = {
  slug: string
  title: string
  description: string
}

type DashboardResponse = {
  data: {
    modules: Module[]
    summary: {
      username: string
      location_count: number
    }
  }
}

type CameraLocation = {
  id: number
  location_name: string
  descriptive_location: string
  camera_identifier: string | null
  live_feed_url: string | null
  camera_specification: Record<string, string | number | null> | null
  yolo_model_metadata: Record<string, string | number | null> | null
  latitude: string | null
  longitude: string | null
}

type LocationsResponse = {
  data: CameraLocation[]
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TOKEN_KEY = 'mini_geospatial_auth_token'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [loginError, setLoginError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const [modules, setModules] = useState<Module[]>([])
  const [locationCount, setLocationCount] = useState(0)
  const [locations, setLocations] = useState<CameraLocation[]>([])
  const [loadError, setLoadError] = useState('')
  const [locationFormError, setLocationFormError] = useState('')

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

  useEffect(() => {
    if (token === null) {
      return
    }

    const loadDashboard = async () => {
      try {
        const [dashboardResponse, locationsResponse] = await Promise.all([
          fetch(`${API_BASE}/dashboard`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE}/locations`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ])

        if (!dashboardResponse.ok || !locationsResponse.ok) {
          throw new Error('Unable to load dashboard data.')
        }

        const dashboardJson = (await dashboardResponse.json()) as DashboardResponse
        const locationsJson = (await locationsResponse.json()) as LocationsResponse

        setModules(dashboardJson.data.modules)
        setLocationCount(dashboardJson.data.summary.location_count)
        setLocations(locationsJson.data)
        setLoadError('')
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load dashboard data.',
        )
      }
    }

    void loadDashboard()
  }, [token])

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsAuthenticating(true)
    setLoginError('')

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const payload = (await response.json()) as
        | LoginResponse
        | {
            message: string
          }

      if (!response.ok || !('data' in payload)) {
        throw new Error('message' in payload ? payload.message : 'Login failed.')
      }

      localStorage.setItem(TOKEN_KEY, payload.data.token)
      setToken(payload.data.token)
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
      const response = await fetch(`${API_BASE}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location_name: locationName,
          descriptive_location: descriptiveLocation,
          camera_identifier: cameraIdentifier || null,
          live_feed_url: liveFeedUrl || null,
          camera_specification: {
            vendor: cameraVendor || null,
            model: cameraModel || null,
            resolution: cameraResolution || null,
            fps: cameraFps === '' ? null : Number(cameraFps),
            field_of_view: cameraFov || null,
          },
          yolo_model_metadata: {
            model_name: modelName || null,
            model_version: modelVersion || null,
            confidence_threshold:
              confidenceThreshold === '' ? null : Number(confidenceThreshold),
            iou_threshold: iouThreshold === '' ? null : Number(iouThreshold),
          },
          latitude: latitude === '' ? null : Number(latitude),
          longitude: longitude === '' ? null : Number(longitude),
        }),
      })

      const payload = (await response.json()) as
        | { data: CameraLocation }
        | { message: string }

      if (!response.ok || !('data' in payload)) {
        throw new Error(
          'message' in payload ? payload.message : 'Unable to save location.',
        )
      }

      setLocations((current) => [payload.data, ...current])
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
        <section className="panel">
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
          <p>Camera locations registered: {locationCount}</p>
        </div>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </header>

      {loadError !== '' && <p className="error-text panel">{loadError}</p>}

      <section className="panel">
        <h2>Project Modules</h2>
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
        {locationFormError !== '' && (
          <p className="error-text">{locationFormError}</p>
        )}
      </section>

      <section className="panel">
        <h2>Registered Camera Locations</h2>
        <div className="location-grid">
          {locations.map((location) => (
            <article key={location.id} className="location-card">
              <h3>{location.location_name}</h3>
              <p>{location.descriptive_location}</p>
              {location.camera_identifier !== null && (
                <p>Camera: {location.camera_identifier}</p>
              )}
              {location.live_feed_url !== null && (
                <p>
                  Feed: <span className="url-text">{location.live_feed_url}</span>
                </p>
              )}
              <p>
                Coordinates: {location.latitude ?? '-'}, {location.longitude ?? '-'}
              </p>
            </article>
          ))}
          {locations.length === 0 && <p>No camera locations saved yet.</p>}
        </div>
      </section>
    </main>
  )
}

export default App
