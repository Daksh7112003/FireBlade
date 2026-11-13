# Frontend Architecture Specification
## Fireblade Ground Control Station (GCS)

---

### Document Metadata
- **Module:** Client Application Architecture
- **Framework:** React 18 / TypeScript / Vite / TailwindCSS
- **Rendering Engines:** HTML5 Canvas (PFD/HUD), MapLibre GL JS (Vector Map), WebRTC/WHEP (Video)

---

## 1. Architectural Philosophy & Design Principles

The Fireblade GCS frontend is an **operator-centric, low-latency, mission-critical Single Page Application (SPA)**. In tactical UAV operations, a front-end UI failure or frame drop during flight control can result in loss of situational awareness or vehicle damage. To guarantee determinism and responsiveness, the client adheres to four core principles:

1. **Decoupled Telemetry vs. DOM Render Pipelines:** High-frequency flight telemetry (arriving over WebSockets at 30-50Hz per vehicle) must **never** trigger full React component tree re-renders. Dynamic telemetry visualization (such as the Artificial Horizon and Altitude/Speed tapes) is rendered directly using hardware-accelerated **HTML5 Canvas 2D contexts** synchronized with browser `requestAnimationFrame` cycles.
2. **Single-Store Multi-Vehicle State Partitioning:** State for up to 32 active UAVs is partitioned within an in-memory Zustand store. Individual components subscribe only to their selected vehicle's sub-slice, eliminating cascading update penalties.
3. **Sub-150ms Zero-Plugin Video:** Video feeds from airborne payloads are ingested via native browser WebRTC using the standardized WebRTC HTTP Egress Protocol (WHEP), avoiding bulky plugins or high-latency HLS/DASH buffering.
4. **Safety-First Ergonomics:** Flight-critical actions (Arming, Disarming, Takeoff, Return-To-Launch, Emergency Pause) utilize two-stage confirmation gestures (slider or modal verification) to prevent accidental mouse clicks.

---

## 2. Component Hierarchy & Layout Structure

The user interface follows a modular, tile-based dashboard layout:

```mermaid
flowchart TD
    App["App (Root Router & Context)"]
    AuthProvider["AuthProvider (JWT Session)"]
    WebSocketProvider["WebSocketProvider (Telemetry & Alerts)"]

    App --> AuthProvider
    AuthProvider --> WebSocketProvider

    WebSocketProvider --> Router["React Router v6 Switch"]

    Router --> LoginPage["LoginPage (/login)"]
    Router --> ProtectedLayout["ProtectedLayout (Top Bar + Sidebar)"]

    ProtectedLayout --> DashboardPage["DashboardPage (/)"]
    ProtectedLayout --> MissionPage["MissionPlannerPage (/missions)"]
    ProtectedLayout --> FleetPage["FleetManagementPage (/fleet)"]
    ProtectedLayout --> VideoWallPage["VideoWallPage (/video)"]

    DashboardPage --> TopNav["TopNavToolbar (Global Fleet Status, Server Health)"]
    DashboardPage --> SplitPane["Tactical SplitPane Layout"]

    SplitPane --> LeftPanel["Left Panel: Map / Video Switcher"]
    SplitPane --> RightPanel["Right Panel: PFD HUD & Quick Telemetry"]
    SplitPane --> BottomTray["Bottom Tray: Action Controls & Status Log"]

    LeftPanel --> TacticalMap["TacticalMap (MapLibre GL Container)"]
    LeftPanel --> WebRtcPlayer["WebRtcPlayer (WHEP Video Player)"]

    TacticalMap --> VehicleMarker["VehicleMarker (Multi-UAV Dynamic Icons)"]
    TacticalMap --> TrajectoryLayer["TrajectoryLayer (Breadcrumbs & Flight Path)"]
    TacticalMap --> GeofenceLayer["GeofenceLayer (Safety Boundaries)"]

    RightPanel --> PfdOverlay["PfdOverlay (Glass Cockpit)"]
    PfdOverlay --> ArtificialHorizon["ArtificialHorizon (HTML5 Canvas)"]
    PfdOverlay --> AltimeterTape["AltimeterTape (MSL / AGL)"]
    PfdOverlay --> AirspeedTape["AirspeedTape (IAS / GS)"]
    PfdOverlay --> CompassRose["CompassRose (360° Heading Ribbon)"]

    BottomTray --> CommandToolbar["CommandToolbar (Arm, Takeoff, Land, RTL, Mode)"]
    BottomTray --> ArmingSwitch["ArmingSwitch (Two-Stage Safety Slider)"]
    BottomTray --> StatusMessageList["StatusMessageList (MAVLink STATUSTEXT)"]
```

---

## 3. State Management Architecture

```mermaid
flowchart LR
    subgraph ExternalSources["External Server Streams"]
        WSS["WebSocket Telemetry Stream (/telemetry)"]
        REST["REST API Server (/api/v1)"]
    end

    subgraph StateTier["Frontend State Layer"]
        subgraph ServerState["Server State (TanStack Query)"]
            RQ_Vehicles["Vehicles Inventory Cache"]
            RQ_Missions["Saved Missions Cache"]
            RQ_Users["Operators & Permissions"]
        end

        subgraph ClientHotState["Client Hot State (Zustand)"]
            Z_Telemetry["telemetryStore<br/>(30Hz In-Memory Ring Buffer)"]
            Z_Control["controlStore<br/>(Active Vehicle & Lease Token)"]
            Z_UI["uiStore<br/>(Layout, Active Panes, Audio)"]
        end
    end

    subgraph ConsumerTier["UI Consumers"]
        CanvasHUD["Canvas PFD HUD (60 FPS Raf Loop)"]
        MapEngine["MapLibre WebGL Engine"]
        Buttons["Command Action Buttons"]
    end

    WSS -->|Throttled Updates| Z_Telemetry
    REST --> ServerState
    Z_Telemetry --> CanvasHUD
    Z_Telemetry --> MapEngine
    Z_Control --> Buttons
    RQ_Vehicles --> Z_Control
```

### 3.1 Store Breakdown
1. **`telemetryStore` (Zustand):**
   - Holds real-time spatial coordinates (lat, lon, alt), velocities, attitude angles (pitch, roll, yaw), battery voltage/percentage, and GPS fix state.
   - Designed with direct mutative setters for speed, avoiding deep object cloning on every 30Hz packet.
2. **`controlStore` (Zustand):**
   - Tracks the active vehicle selected by the operator (`selectedVehicleId`).
   - Maintains the client's current **Control Lease** state: whether the local operator holds the exclusive flight command token for the active UAV, the lease expiration timestamp, and preemption warnings.
3. **`vehicleStore` (TanStack Query + Zustand):**
   - Retains metadata: vehicle model, firmware type (PX4 vs. ArduPilot), serial number, MAVLink sysId/compId, and communication link status.
4. **`uiStore` (Zustand):**
   - Manages screen split ratios, HUD overlay visibility toggles, measurement unit preferences (Metric vs. Imperial), and visual/audio alert acknowledgments.

---

## 4. Primary Flight Display (PFD) High-Rate Rendering Loop

To achieve fluid, tear-free **60 FPS** flight instruments without impacting React DOM performance, the PFD HUD uses a **Direct Canvas Drawing Loop** driven by `requestAnimationFrame`:

```typescript
// Architectural implementation pattern for Canvas PFD
export const useCanvasAnimation = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  vehicleId: string
) => {
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // 1. Fetch latest telemetry directly from in-memory store without triggering React render
      const telemetry = useTelemetryStore.getState().vehicles[vehicleId];
      if (telemetry) {
        // 2. Clear canvas viewport
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 3. Draw Pitch & Roll Horizon
        drawArtificialHorizon(ctx, canvas.width, canvas.height, telemetry.pitch, telemetry.roll);
        
        // 4. Draw Flight Director & Crosshairs
        drawCrosshairs(ctx, canvas.width, canvas.height);
      }

      // 5. Schedule next frame
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [vehicleId]);
};
```

---

## 5. MapLibre GL Integration Architecture

The tactical map provides full geospatial situational awareness:
- **Offline Capability:** Configured to load pre-seeded vector tiles from the local server (`http://server-ip/tiles/style.json`), allowing fully air-gapped operation in field environments with zero internet access.
- **Dynamic Vehicle Symbols:** Each UAV is represented by an independent GeoJSON feature. Vehicle symbols are updated dynamically using `map.getSource('vehicles').setData(...)` at 10-20Hz.
- **Interactive Waypoint Mission Tooling:** Allows operators to click to create waypoints, drag waypoint handles to adjust coordinates, and configure altitude and speed in real-time.

---

## 6. Real-Time Gamepad / Joystick Flight Control

For manual or assisted manual piloting, the client interfaces directly with the browser's standard **HTML5 Gamepad API**:
- **Polling Loop:** A dedicated high-priority 50Hz interval polls connected USB gamepads (e.g., Xbox, PlayStation, or FrSky/Radiomaster USB RC transmitters).
- **Stick Mapping:** Normalizes axes into standard MAVLink `MANUAL_CONTROL` channels:
  - Axis 0 (Roll): -1000 to +1000
  - Axis 1 (Pitch): -1000 to +1000
  - Axis 2 (Throttle): 0 to 1000
  - Axis 3 (Yaw): -1000 to +1000
- **Safety Interlock:** Gamepad inputs are only transmitted to the backend if the operator holds an active, verified **Control Lease** for that vehicle. If the browser tab loses focus, stick commands immediately zero out to prevent runaway conditions.
