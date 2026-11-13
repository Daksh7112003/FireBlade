# File-By-File Source Code Specification
## Fireblade Ground Control Station (GCS)

---

### Document Metadata
- **Module:** Complete System Source Inventory & Code Specification
- **Classification:** Architectural Blueprint
- **Scope:** Canonical Specification of Every Planned Module, File, Class, and Interface

---

## 1. Scope & Implementation Audit

This document details the complete source code architecture for Fireblade GCS. As established in the workspace audit, the repository is at the **Genesis / Greenfield Inception Phase**. This document defines the exact contracts, signatures, class hierarchies, state models, algorithms, and integration points that govern each file.

---

## 2. Frontend Source Files (`client/src/`)

### 2.1 Entry Point & Core Configuration

#### `client/src/main.tsx`
- **Path:** `client/src/main.tsx`
- **Module:** Client Application Root
- **File Type:** TypeScript React DOM Entry (`.tsx`)
- **Purpose:** Initializes the React 18 Virtual DOM root, attaches the application to `#root` in `index.html`, and sets up strict mode and global providers.
- **Key Code Elements:**
  - `ReactDOM.createRoot(document.getElementById('root')!)`: Mount point.
  - `<React.StrictMode>`: Wraps runtime to identify unsafe lifecycles.
  - Global CSS import: `import './index.css';`
- **Dependencies:** `react`, `react-dom/client`, `./App.tsx`.
- **Execution Flow:** Executes immediately upon browser loading the compiled bundle. Mounts `<App />`.

#### `client/src/App.tsx`
- **Path:** `client/src/App.tsx`
- **Module:** Application Routing & Context Shell
- **File Type:** TypeScript React Component (`.tsx`)
- **Purpose:** Configures top-level React Router v6 routes, sets up global QueryClientProvider (TanStack Query), and initializes the persistent WebSocket telemetry listener.
- **Key Code Elements:**
  - `queryClient = new QueryClient()`: Manages server-state caching and invalidation.
  - `<BrowserRouter>`: Defines SPA client-side routing.
  - Route definitions: `/` (Dashboard), `/missions` (Mission Planner), `/fleet` (Fleet Management), `/video` (Video Wall), `/login` (Operator Login).
  - `<ProtectedRoute>`: HOC enforcing valid JWT authentication before rendering flight screens.
- **Dependencies:** `react-router-dom`, `@tanstack/react-query`, `useTelemetry` hook, `authStore`.
- **Execution Flow:** Mounts after `main.tsx`, checks for stored JWT in `localStorage`, initiates background WebSocket connection to the server.

---

### 2.2 Tactical HUD & Visualization (`client/src/components/hud/`)

#### `client/src/components/hud/ArtificialHorizon.tsx`
- **Path:** `client/src/components/hud/ArtificialHorizon.tsx`
- **Module:** Primary Flight Display (PFD)
- **File Type:** TypeScript React Canvas Component (`.tsx`)
- **Purpose:** Renders a 60 FPS HTML5 Canvas artificial horizon visualizing vehicle pitch and roll angles with sky/ground color separation, pitch ladder, and bank indicator.
- **Key Code Elements:**
  - `interface Props { pitch: number; roll: number; size?: number; }`
  - `useRef<HTMLCanvasElement>(null)`: Reference to hardware-accelerated canvas.
  - `requestAnimationFrame` loop: Updates canvas transform matrices without triggering React DOM re-renders.
  - `renderHorizon(ctx, pitch, roll)`: Uses canvas `ctx.translate()` and `ctx.rotate()` to draw earth (brown) and sky (blue) polygons, followed by pitch ladder increments (5°, 10°, 20°).
- **Dependencies:** `react`, `useTelemetryStore`.
- **Execution Flow:** Receives high-frequency attitude telemetry (30-50Hz) from `telemetryStore`, executes render draw calls on each animation frame.

#### `client/src/components/hud/AltimeterTape.tsx`
- **Path:** `client/src/components/hud/AltimeterTape.tsx`
- **Module:** Primary Flight Display (PFD)
- **File Type:** TypeScript React Component (`.tsx`)
- **Purpose:** Displays a vertical scrolling altimeter tape on the right side of the HUD showing Mean Sea Level (MSL) altitude, Above Ground Level (AGL) altitude, and vertical speed (VSI).
- **Key Code Elements:**
  - `interface Props { altitudeMsl: number; altitudeAgl: number; verticalSpeed: number; }`
  - `tapeOffset = (altitude % 10) * pixelRatio`: Calculates smooth scrolling offset.
  - `renderVsiArrow(speed: number)`: Renders a color-coded vertical speed pointer (climbing = green, descending = amber/red).
- **Dependencies:** `react`, `lucide-react`.

#### `client/src/components/hud/AirspeedTape.tsx`
- **Path:** `client/src/components/hud/AirspeedTape.tsx`
- **Module:** Primary Flight Display (PFD)
- **File Type:** TypeScript React Component (`.tsx`)
- **Purpose:** Displays a vertical scrolling airspeed indicator on the left side of the HUD showing Indicated Airspeed (IAS) and Ground Speed (GS).
- **Key Code Elements:**
  - `interface Props { indicatedAirspeed: number; groundSpeed: number; }`
  - Dynamic speed band coloring: Stall speed (red), normal operating range (green), caution (amber), Vne velocity never exceed (red hatched).

#### `client/src/components/hud/CompassRose.tsx`
- **Path:** `client/src/components/hud/CompassRose.tsx`
- **Module:** Primary Flight Display (PFD)
- **File Type:** TypeScript React Canvas Component (`.tsx`)
- **Purpose:** Displays a rotating 360-degree compass card/heading ribbon showing magnetic heading, yaw, and ground track.
- **Key Code Elements:**
  - `interface Props { heading: number; track: number; }`
  - Cardinal markers: N (0°), E (90°), S (180°), W (270°).

---

### 2.3 Tactical Map Components (`client/src/components/map/`)

#### `client/src/components/map/TacticalMap.tsx`
- **Path:** `client/src/components/map/TacticalMap.tsx`
- **Module:** Geospatial Situational Awareness
- **File Type:** TypeScript React Component (`.tsx`)
- **Purpose:** Wraps the MapLibre GL map container. Coordinates raster/vector basemap tiles, terrain elevation rendering, and child layers.
- **Key Code Elements:**
  - `mapRef = useRef<maplibregl.Map | null>(null)`: Retains persistent WebGL map instance.
  - `useEffect()`: Initializes map with offline vector tile sources (`http://server-ip/tiles/style.json`), center coordinates, and zoom limits.
  - Event listeners: `click`, `mousemove`, `contextmenu` for dropping tactical markers or defining mission waypoints.
- **Dependencies:** `maplibre-gl`, `useVehicleStore`, `useTelemetryStore`.

#### `client/src/components/map/VehicleMarker.tsx`
- **Path:** `client/src/components/map/VehicleMarker.tsx`
- **Module:** Tactical Map Entity Overlay
- **File Type:** TypeScript React Component (`.tsx`)
- **Purpose:** Places high-performance SVG or WebGL markers representing each active UAV on the tactical map, rotated dynamically to match true heading.
- **Key Code Elements:**
  - `interface Props { vehicleId: string; lat: number; lon: number; heading: number; isSelected: boolean; }`
  - SVG Aircraft Icon: Dynamic color coding based on vehicle flight mode (Auto = cyan, Loiter = green, RTL = yellow, Emergency = red).
  - Selection Ring: Highlights the active vehicle currently selected by the operator.

#### `client/src/components/map/TrajectoryLayer.tsx`
- **Path:** `client/src/components/map/TrajectoryLayer.tsx`
- **Module:** Tactical Map Geospatial History
- **File Type:** TypeScript React Component (`.tsx`)
- **Purpose:** Renders dynamic GeoJSON LineString layers representing:
  1. The historic flight breadcrumb path of the UAV.
  2. The projected future trajectory based on current ground velocity.
  3. The planned waypoint mission path.
- **Dependencies:** `maplibre-gl`, `geojson`.

---

### 2.4 Video Streaming Components (`client/src/components/video/`)

#### `client/src/components/video/WebRtcPlayer.tsx`
- **Path:** `client/src/components/video/WebRtcPlayer.tsx`
- **Module:** Live Payload Video Player
- **File Type:** TypeScript React Component (`.tsx`)
- **Purpose:** Establishes a standard WHEP (WebRTC HTTP Egress Protocol) session with MediaMTX and binds the resulting WebRTC media stream to an HTML5 `<video>` element for sub-150ms playback.
- **Key Code Elements:**
  - `videoRef = useRef<HTMLVideoElement>(null)`
  - `pc = new RTCPeerConnection({ iceServers: [...] })`: Creates client WebRTC peer connection.
  - `initiateWhepSession(streamPath: string)`:
    - Creates WebRTC offer via `pc.createOffer({ offerToReceiveVideo: true })`.
    - Sends SDP offer to MediaMTX WHEP endpoint (`POST /whep/live/uav_1_cam`).
    - Receives SDP answer and applies `pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))`.
  - Event Listener: `pc.ontrack = (event) => { videoRef.current.srcObject = event.streams[0]; }`
- **Dependencies:** `react`, `useWebRtcStream`.

---

### 2.5 State Management Stores (`client/src/stores/`)

#### `client/src/stores/telemetryStore.ts`
- **Path:** `client/src/stores/telemetryStore.ts`
- **Module:** State Management (Telemetry)
- **File Type:** TypeScript Store (`.ts`)
- **Purpose:** High-performance Zustand store maintaining real-time telemetry state for all active UAVs.
- **Key Code Elements:**
  - `interface TelemetryState { vehicles: Record<string, VehicleTelemetry>; updateTelemetry: (uavId: string, packet: Partial<VehicleTelemetry>) => void; }`
  - High-frequency update buffering: Updates are applied in place to avoid unnecessary React re-renders of unrelated components.
- **Dependencies:** `zustand`.

#### `client/src/stores/controlStore.ts`
- **Path:** `client/src/stores/controlStore.ts`
- **Module:** State Management (Operator Control Leases)
- **File Type:** TypeScript Store (`.ts`)
- **Purpose:** Tracks whether the local operator holds the exclusive flight control lease for the selected UAV.
- **Key Code Elements:**
  - `interface ControlState { activeVehicleId: string | null; hasControlLease: boolean; leaseExpiresAt: number | null; acquireLease: (vehicleId: string) => Promise<boolean>; releaseLease: () => Promise<void>; }`

---

## 3. Backend Source Files (`server/src/`)

### 3.1 Entry Point & Root Module

#### `server/src/main.ts`
- **Path:** `server/src/main.ts`
- **Module:** NestJS Application Bootstrapper
- **File Type:** TypeScript (`.ts`)
- **Purpose:** Bootstraps the NestJS server instance, attaches global validation pipes, sets up CORS for the local network, and configures the WebSocket adapter.
- **Key Code Elements:**
  - `const app = await NestFactory.create(AppModule)`
  - `app.useWebSocketAdapter(new IoAdapter(app))`
  - `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`
  - `app.enableCors({ origin: '*' })`: Enables LAN operator browser connections.
  - `await app.listen(process.env.PORT || 3000, '0.0.0.0')`: Binds to all network interfaces.
- **Dependencies:** `@nestjs/core`, `@nestjs/platform-socket.io`, `AppModule`.

#### `server/src/app.module.ts`
- **Path:** `server/src/app.module.ts`
- **Module:** Root Dependency Injection Module
- **File Type:** TypeScript (`.ts`)
- **Purpose:** Imports and configures all domain modules, configuration modules, and database connections.
- **Key Code Elements:**
  - `imports`: `ConfigModule`, `DatabaseModule`, `AuthModule`, `VehiclesModule`, `TelemetryModule`, `CommandsModule`, `MissionsModule`, `VideoModule`, `SystemModule`.

---

### 3.2 Telemetry Ingestion & WebSocket (`server/src/modules/telemetry/`)

#### `server/src/modules/telemetry/telemetry.gateway.ts`
- **Path:** `server/src/modules/telemetry/telemetry.gateway.ts`
- **Module:** Real-Time WebSocket Telemetry Distribution
- **File Type:** TypeScript NestJS Gateway (`.ts`)
- **Purpose:** Manages WebSocket connections from browser operators, authenticates connection tokens, joins operators to specific vehicle rooms, and broadcasts throttled telemetry packets at 30Hz.
- **Key Code Elements:**
  - `@WebSocketGateway({ cors: { origin: '*' }, namespace: '/telemetry' })`
  - `@WebSocketServer() server: Server`
  - `handleConnection(client: Socket)`: Verifies JWT query token.
  - `@SubscribeMessage('subscribe:vehicle')`: Adds client to room `uav_${payload.vehicleId}`.
  - `broadcastVehicleTelemetry(vehicleId: string, data: any)`: Emits `telemetry:update` to room subscribers.
- **Dependencies:** `@nestjs/websockets`, `socket.io`, `JwtService`.

#### `server/src/modules/telemetry/telemetry.service.ts`
- **Path:** `server/src/modules/telemetry/telemetry.service.ts`
- **Module:** Telemetry Aggregation & Ingestion
- **File Type:** TypeScript NestJS Service (`.ts`)
- **Purpose:** Subscribes to Redis Pub/Sub channels where `flight-core` pushes raw telemetry, aggregates vehicle status, and queues persistent batched writes to TimescaleDB.
- **Key Code Elements:**
  - `redisSubscriber.subscribe('telemetry:broadcast')`
  - `processIncomingPacket(channel: string, message: string)`: Deserializes JSON/binary payload and forwards to `telemetry.gateway`.
  - Batching queue: Buffers telemetry rows in memory and flushes bulk `INSERT` statements to TimescaleDB every 1000ms.
- **Dependencies:** `ioredis`, `TelemetryGateway`, `TelemetryLogRepository`.

---

### 3.3 Command & Control (`server/src/modules/commands/`)

#### `server/src/modules/commands/commands.controller.ts`
- **Path:** `server/src/modules/commands/commands.controller.ts`
- **Module:** Flight Command Endpoints
- **File Type:** TypeScript NestJS Controller (`.ts`)
- **Purpose:** Exposes secured REST API endpoints for operator actions: Arm, Disarm, Set Flight Mode, Takeoff, Land, Return-To-Launch (RTL), and Goto Coordinate.
- **Key Code Elements:**
  - `@Post(':id/arm')`: Requires valid JWT and verified active control lease.
  - `@Post(':id/mode')`: Changes autopilot flight mode (e.g., GUIDED, AUTO, LOITER).
  - `@Post(':id/takeoff')`: Initiates autonomous takeoff to requested altitude.
  - `@UseGuards(JwtAuthGuard, RolesGuard, ControlLeaseGuard)`: Security interceptors.
- **Dependencies:** `CommandsService`, `LeaseService`.

#### `server/src/modules/commands/commands.service.ts`
- **Path:** `server/src/modules/commands/commands.service.ts`
- **Module:** Command Dispatch & Acknowledgement Tracker
- **File Type:** TypeScript NestJS Service (`.ts`)
- **Purpose:** Constructs MAVLink v2 `COMMAND_LONG` and `COMMAND_INT` payloads, pushes them to the `flight-core` IPC queue, and manages asynchronous `COMMAND_ACK` confirmation with timeout and retry logic.
- **Key Code Elements:**
  - `dispatchCommand(vehicleId: string, commandId: number, params: number[])`:
    - Generates unique transaction ID.
    - Publishes to Redis channel `commands:outgoing`.
    - Creates a 3000ms Promise waiting for `COMMAND_ACK` event.
    - Retries up to 3 times before returning `TIMEOUT_ERROR` to the operator.
- **Dependencies:** `ioredis`, `AuditLogService`.

#### `server/src/modules/commands/lease.service.ts`
- **Path:** `server/src/modules/commands/lease.service.ts`
- **Module:** Single-Operator Mutual Exclusion Engine
- **File Type:** TypeScript NestJS Service (`.ts`)
- **Purpose:** Ensures that exactly one operator holds the flight control token for any given vehicle at any moment, preventing dangerous command collisions.
- **Key Code Elements:**
  - `acquireLease(vehicleId: string, operatorId: string, ttlSeconds = 30)`:
    - Uses Redis atomic `SET control:lease:uav_${vehicleId} ${operatorId} NX EX ${ttlSeconds}`.
    - Returns `true` if acquired, `false` if already held by another operator.
  - `renewLease(vehicleId: string, operatorId: string)`: Extends TTL if the operator continues sending active heartbeats.
  - `forcePreempt(vehicleId: string, commanderId: string)`: Allows Mission Commanders to revoke a pilot's lease in an emergency.
- **Dependencies:** `ioredis`.

---

## 4. Flight Communications Core (`flight-core/src/`)

### 4.1 Networking & Protocol Daemon

#### `flight-core/src/main.cpp`
- **Path:** `flight-core/src/main.cpp`
- **Module:** Flight Core Entry Point
- **File Type:** C++ Source (`.cpp`)
- **Purpose:** Initializes asynchronous event loop, instantiates UDP socket listeners, connects to Redis, and starts the multi-UAV routing daemon.
- **Key Code Elements:**
  - `asio::io_context ioContext`: High-performance asynchronous I/O context.
  - `UdpConnection udpListener(ioContext, 14550)`: Binds to standard MAVLink UDP port.
  - Signal handling for graceful shutdown (`SIGINT`, `SIGTERM`).

#### `flight-core/src/UdpConnection.cpp`
- **Path:** `flight-core/src/UdpConnection.cpp`
- **Module:** High-Throughput Socket Handler
- **File Type:** C++ Source (`.cpp`)
- **Purpose:** Listens asynchronously on UDP port 14550, reads raw datagrams into circular memory buffers, and passes them to `MavlinkParser`. Transmits outgoing commands to the remote vehicle IP/port.
- **Key Code Elements:**
  - `startReceive()`: Calls `socket_.async_receive_from(asio::buffer(recvBuffer_), remoteEndpoint_, ...)`.
  - Zero-copy buffer handling: Passes received buffer pointers directly to the parser.
  - `sendPacket(const uint8_t* buffer, size_t length, const asio::ip::udp::endpoint& target)`: Non-blocking socket write.

#### `flight-core/src/MavlinkParser.cpp`
- **Path:** `flight-core/src/MavlinkParser.cpp`
- **Module:** MAVLink v2 Binary Protocol Engine
- **File Type:** C++ Source (`.cpp`)
- **Purpose:** Decodes raw binary bytes using MAVLink v2 C headers. Verifies CRC-16 checksums, extracts `sysid`, `compid`, and `msgid`, and unpacks payload messages.
- **Key Code Elements:**
  - `mavlink_parse_char(MAVLINK_COMM_0, byte, &msg, &status)`: State machine parser.
  - Handled Message IDs:
    - `MAVLINK_MSG_ID_HEARTBEAT` (Msg 0)
    - `MAVLINK_MSG_ID_SYS_STATUS` (Msg 1)
    - `MAVLINK_MSG_ID_GPS_RAW_INT` (Msg 24)
    - `MAVLINK_MSG_ID_ATTITUDE` (Msg 30)
    - `MAVLINK_MSG_ID_GLOBAL_POSITION_INT` (Msg 33)
    - `MAVLINK_MSG_ID_VFR_HUD` (Msg 74)
    - `MAVLINK_MSG_ID_COMMAND_ACK` (Msg 77)
    - `MAVLINK_MSG_ID_STATUSTEXT` (Msg 253)
  - `VehicleRouter::routeMessage(msg)`: Dispatches parsed message to the vehicle's specific pipeline.

#### `flight-core/src/VehicleRouter.cpp`
- **Path:** `flight-core/src/VehicleRouter.cpp`
- **Module:** Multi-UAV Isolation Table
- **File Type:** C++ Source (`.cpp`)
- **Purpose:** Maintains a thread-safe registry of all discovered vehicles indexed by `sysid`. Tracks heartbeat timestamps, detects lost connections, and maps outgoing commands to the correct IP endpoint.
- **Key Code Elements:**
  - `std::unordered_map<uint8_t, VehicleState> vehicleRegistry_`: Thread-safe vehicle state map.
  - `checkTimeouts()`: Periodically scans active vehicles; marks vehicle disconnected if no heartbeat is received for 3000ms.

#### `flight-core/src/RedisPublisher.cpp`
- **Path:** `flight-core/src/RedisPublisher.cpp`
- **Module:** High-Speed Telemetry Bus Interop
- **File Type:** C++ Source (`.cpp`)
- **Purpose:** Serializes unpacked MAVLink telemetry structs and publishes them to Redis channel `telemetry:broadcast` using `hiredis` async client.

