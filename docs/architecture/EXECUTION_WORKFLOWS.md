# End-to-End Execution Workflows
## Fireblade Ground Control Station (GCS)

---

### Document Metadata
- **Module:** System Runtime Dynamics & Sequence Specifications
- **Workflows Documented:** 18 Critical End-to-End Operational Workflows
- **Implementation Status:** Architecture Specification (Greenfield Inception Phase)

---

## Workflow 1: Application Startup & System Boot

```mermaid
sequenceDiagram
    autonumber
    participant Host as Ubuntu Host System
    participant Docker as Docker Compose
    participant DB as PostgreSQL + TimescaleDB
    participant Redis as Redis 7.2 Broker
    participant FC as Flight-Core Daemon (C++)
    participant Media as MediaMTX Streaming Server
    participant Nest as NestJS Backend API
    participant Nginx as Nginx Web Ingress

    Host->>Docker: docker compose up -d
    Docker->>DB: Start postgres container (Initialize PostGIS & TimescaleDB)
    Docker->>Redis: Start redis container (Port 6379)
    Docker->>Media: Start mediamtx (Bind RTSP 8554, WebRTC 8889, UDP 8555)
    
    Docker->>FC: Start flight-core daemon
    FC->>Redis: Connect hiredis client to Redis
    FC->>FC: Open asynchronous UDP socket on port 14550
    
    Docker->>Nest: Start NestJS application
    Nest->>DB: Run TypeORM schema migrations
    Nest->>Redis: Subscribe to telemetry and command pub/sub channels
    Nest->>Nest: Initialize Socket.IO WebSocket gateway (/telemetry)
    
    Docker->>Nginx: Start Nginx container (Serve React bundle on Port 80/443)
    Nginx->>Nest: Verify upstream healthcheck (GET /api/v1/health)
    Nest-->>Nginx: 200 OK { status: "UP" }
```

- **Files Involved:** `deploy/docker-compose.yml`, `flight-core/src/main.cpp`, `server/src/main.ts`, `server/src/database/database.module.ts`.
- **Functions:** `UdpConnection::startReceive()`, `NestFactory.create()`, `app.listen()`.

---

## Workflow 2: Operator Authentication & Session Creation

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Field Pilot
    participant Browser as React SPA (LoginPage)
    participant Nginx as Nginx Proxy
    participant AuthCtrl as AuthController
    participant AuthSvc as AuthService
    participant DB as PostgreSQL (users table)

    Operator->>Browser: Enters username, password, workstation ID
    Browser->>Nginx: POST /api/v1/auth/login
    Nginx->>AuthCtrl: Forward request
    AuthCtrl->>AuthSvc: validateUser(username, password)
    AuthSvc->>DB: SELECT * FROM users WHERE username = $1
    DB-->>AuthSvc: User record (with password_hash)
    AuthSvc->>AuthSvc: bcrypt.compare(password, password_hash)
    AuthSvc->>AuthSvc: jwtService.sign({ sub: id, role: role, workstation: wsId })
    AuthSvc-->>AuthCtrl: { accessToken, refreshToken, user }
    AuthCtrl-->>Browser: 200 OK (Tokens returned)
    Browser->>Browser: Store accessToken in localStorage & navigate to /
```

- **Files:** `client/src/pages/LoginPage.tsx`, `server/src/modules/auth/auth.service.ts`.
- **Functions:** `AuthService.login()`, `useAuthStore.setSession()`.

---

## Workflow 3: Dashboard Initialization & State Hydration

1. Browser renders `DashboardPage.tsx`.
2. React mounts `WebSocketProvider.tsx` and establishes socket connection `ws://server/telemetry?token=JWT`.
3. Frontend issues `GET /api/v1/vehicles` to hydrate existing fleet list.
4. Tactical Map initializes WebGL canvas, loading offline vector style from `/tiles/style.json`.

---

## Workflow 4: UAV Connection & Multi-UAV Discovery

```mermaid
sequenceDiagram
    autonumber
    participant UAV as UAV Alpha (PX4, SysID: 1)
    participant Socket as Flight-Core UDP (14550)
    participant Parser as MavlinkParser
    participant Router as VehicleRouter
    participant Redis as Redis Pub/Sub
    participant Nest as NestJS VehiclesService
    participant WS as TelemetryGateway
    participant UI as Operator Browser

    UAV->>Socket: UDP Datagram containing MAVLink HEARTBEAT (sysid: 1)
    Socket->>Parser: mavlink_parse_char(byte)
    Parser->>Router: routeMessage(msg)
    
    Note over Router: Checks internal registry for sysid == 1
    Router->>Router: New sysid detected! Register UAV-1 (Endpoint: 192.168.10.150:14550)
    
    Router->>Redis: PUBLISH vehicle:discovered { sysId: 1, type: "QUADROTOR", autopilot: "PX4" }
    Redis->>Nest: Message received on vehicle:discovered
    Nest->>Nest: Insert or update vehicle in PostgreSQL
    Nest->>WS: Broadcast vehicle:status:change to all operators
    WS-->>UI: WebSocket event: vehicle:status:change
    UI->>UI: Adds UAV Alpha to FleetOverviewGrid and Map
```

- **Files:** `flight-core/src/MavlinkParser.cpp`, `flight-core/src/VehicleRouter.cpp`, `server/src/modules/vehicles/vehicles.service.ts`.

---

## Workflow 5: MAVLink Telemetry Reception & UI Updates

```mermaid
sequenceDiagram
    autonumber
    participant UAV as Airborne UAV
    participant FC as Flight-Core
    participant Redis as Redis (telemetry:broadcast)
    participant Broadcaster as TelemetryBroadcaster
    participant WS as TelemetryGateway
    participant Store as frontend telemetryStore
    participant Canvas as PFD Canvas Loop

    UAV->>FC: High-Frequency MAVLink (ATTITUDE 30Hz, GLOBAL_POSITION_INT 10Hz)
    FC->>FC: Zero-copy unpack into TelemetryStruct
    FC->>Redis: PUBLISH telemetry:broadcast { sysId, pitch, roll, yaw, lat, lon, alt }
    
    Redis->>Broadcaster: Ingest packet
    Note over Broadcaster: Buffers & throttles to deterministic 30Hz room tick
    Broadcaster->>WS: Emit to room uav_1: vehicle:telemetry:update
    WS-->>Store: WebSocket event received
    Store->>Store: In-place update to vehicles["uav_1"]
    
    Note over Canvas: requestAnimationFrame triggers
    Canvas->>Store: Read latest pitch/roll directly
    Canvas->>Canvas: Draw artificial horizon at 60 FPS
```

---

## Workflow 6: Vehicle Selection & Control Lease Acquisition

1. Operator clicks UAV-1 in `FleetOverviewGrid.tsx`.
2. UI updates `controlStore.selectedVehicleId = 'uav_1'`.
3. Operator clicks **"Acquire Flight Control"**.
4. Frontend triggers `POST /api/v1/operators/lease-control { vehicleId: 'uav_1' }`.
5. Backend invokes `leaseService.acquireLease()`. Redis executes `SET control:lease:uav_1 operator_id NX EX 30`.
6. Lease granted: UI updates `LeaseBadge` to green ("CONTROL ACTIVE").

---

## Workflow 7: Command Execution (Arming & Takeoff)

1. Operator slides `ArmingSwitch.tsx` to ARM.
2. Frontend sends `POST /api/v1/vehicles/uav_1/arm { arm: true }`.
3. `CommandsController` verifies operator holds active lease via `ControlLeaseGuard`.
4. `CommandsService` formats MAVLink `COMMAND_LONG` (Msg 76) with command `MAV_CMD_COMPONENT_ARM_DISARM`.
5. Packet pushed to `commands:outgoing` in Redis.
6. `FlightCore` transmits UDP packet to UAV-1.
7. Autopilot verifies safety checks and returns `COMMAND_ACK` (MAV_RESULT_ACCEPTED).
8. Backend resolves pending HTTP promise; UI displays "ARMED" status.

---

## Workflow 8: Mission Planning & Waypoint Upload

1. Operator opens `MissionPlannerPage.tsx`.
2. Clicks on tactical map to drop waypoints (WP 1: Takeoff, WP 2: Survey Point, WP 3: Survey Point, WP 4: RTL).
3. Client validates altitude limits and geofence intersections.
4. Clicks **"Upload Mission to UAV"**.
5. Backend initiates MAVLink Mission Protocol: sends `MISSION_COUNT (4)`.
6. Autopilot requests each item via `MISSION_REQUEST_INT(seq)`.
7. Backend streams corresponding `MISSION_ITEM_INT` coordinates.
8. Autopilot verifies checksum and emits `MISSION_ACK (MAV_MISSION_ACCEPTED)`.

---

## Workflow 9: Camera Connection & WebRTC Video Streaming

1. Airborne payload camera boots and serves RTSP at `rtsp://192.168.10.150:8554/cam1`.
2. MediaMTX detects stream path on-demand via `mediamtx.yml`.
3. Operator browser mounts `WebRtcPlayer.tsx`.
4. Browser generates WebRTC SDP offer and sends `POST /whep/live/uav_1_cam_1`.
5. MediaMTX binds video track and returns SDP answer (201 Created).
6. ICE gathering completes over UDP port 8555; browser displays live video with < 150ms glass-to-glass latency.

---

## Workflow 10: Operator Control Handover & Preemption

1. Pilot A holds control of UAV-1.
2. Pilot B requests handover via UI.
3. Pilot A receives in-app confirmation modal: "Transfer control to Pilot B?".
4. If approved: Backend deletes Pilot A's lease key and sets Pilot B's key.
5. In an emergency: Commander invokes **"Force Preempt"**, immediately seizing control lease and notifying Pilot A via WebSocket.

---

## Workflow 11: Vehicle Disconnection & Timeout Recovery

1. UAV-1 experiences RF jamming or moves behind terrain.
2. `FlightCore` heartbeat scanner notes no packet for 3000ms.
3. GCS flags vehicle status as `LOST_HEARTBEAT`; UI triggers audio chime.
4. At 10000ms: Status transitions to `DISCONNECTED`; control lease is revoked.
5. Autopilot on-board failsafe activates: UAV autonomously enters **RTL (Return-To-Launch)**.
6. When UAV regains line-of-sight and transmits a heartbeat, `FlightCore` automatically restores connection state to `STREAMING_TELEMETRY`.

---

## Workflow 12: Backend Crash & Failover Recovery

1. If the NestJS process crashes, Docker automatically restarts the container (`restart: unless-stopped`).
2. Because Redis maintains active lease state in memory, control leases persist across backend restarts without disruption.
3. Operators' browser WebSocket connections reconnect with exponential backoff and resume telemetry display instantly.

