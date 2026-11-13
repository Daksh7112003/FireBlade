# MAVLink & Multi-UAV Architecture Specification
## Fireblade Ground Control Station (GCS)

---

### Document Metadata
- **Protocol:** MAVLink v2 (Micro Air Vehicle Link)
- **Transport Layers:** UDP (Default: 14550), TCP (5760), Serial UART / USB (115200 / 57600 baud)
- **Autopilot Compatibility:** PX4 Autopilot (v1.13+) and ArduPilot (ArduCopter / ArduPlane / ArduRover 4.0+)
- **Concurrency Target:** 32+ simultaneous independent UAVs

---

## 1. MAVLink Protocol Foundation

Fireblade GCS communicates with airborne autopilots using the **MAVLink v2** framing standard. MAVLink v2 provides significant operational advantages over v1:
1. **24-bit Message IDs:** Extends the message catalog to 16 million unique message types, supporting advanced payload sensors, collision avoidance, and swarm protocols.
2. **Packet Signing (Security):** Cryptographic SHA-256 signatures can be appended to the packet trailer, protecting ground-to-air flight commands against packet injection and spoofing over open RF links.
3. **Payload Truncation / Zero-Byte Suppression:** Automatically strips trailing zero bytes from telemetry packets, saving up to 40% bandwidth on low-baud rate radio datalinks (e.g., 57600 baud RFD900x modems).

```
MAVLink v2 Packet Structure:
+----+------+------+--------+--------+--------+--------+--------+--------+--------+--------+--------+
| STX| LEN  | INC  | CMP    | SEQ    | SYS_ID | COMP_ID|   MSG_ID (3B)   | PAYLOAD|   CRC  | SIGN   |
|0xFD|0..255| FLAGS| FLAGS  | 0..255 | 1..255 | 1..255 | Byte 0, 1, 2    | 0..255B| 2 Bytes| 13 Bytes|
+----+------+------+--------+--------+--------+--------+--------+--------+--------+--------+--------+
```

---

## 2. Multi-UAV Routing & System ID Isolation

A critical vulnerability in naive multi-UAV GCS designs is **cross-talk**: sending a command intended for UAV 1 that is accidentally executed by UAV 2. Fireblade GCS guarantees zero cross-talk through a **Strict Routing & Isolation Architecture**:

```mermaid
flowchart TD
    subgraph Radios["Physical RF / Network Interfaces"]
        UDP_PORT["UDP Ingress (Port 14550)"]
        SERIAL_PORT["Serial Modem (/dev/ttyUSB0)"]
    end

    subgraph ParserEngine["Flight Core MAVLink Parser"]
        RAW_BUF["Raw Byte Ingestion Ring Buffer"]
        STATE_MACHINE["MAVLink State Machine (mavlink_parse_char)"]
        CRC_VERIFY["CRC-16 Extra & Signature Verification"]
    end

    subgraph Router["Vehicle Demultiplexer & Routing Table"]
        SYS_ROUTER{"Inspect Header<br/>msg.sysid"}
        UAV1_PIPE["Queue: Vehicle 1 (SysID: 1)"]
        UAV2_PIPE["Queue: Vehicle 2 (SysID: 2)"]
        UAVN_PIPE["Queue: Vehicle N (SysID: N)"]
    end

    subgraph BackendDispatch["Application State & Dispatch"]
        REDIS_CHAN["Redis Pub/Sub Channel:<br/>telemetry:uav:{sysid}"]
    end

    UDP_PORT & SERIAL_PORT --> RAW_BUF
    RAW_BUF --> STATE_MACHINE
    STATE_MACHINE --> CRC_VERIFY
    CRC_VERIFY --> SYS_ROUTER

    SYS_ROUTER -->|sysid == 1| UAV1_PIPE
    SYS_ROUTER -->|sysid == 2| UAV2_PIPE
    SYS_ROUTER -->|sysid == N| UAVN_PIPE

    UAV1_PIPE & UAV2_PIPE & UAVN_PIPE --> REDIS_CHAN
```

### 2.1 Routing Invariant Rules:
1. **Dynamic Vehicle Discovery:** When a packet containing a previously unseen `sysid` arrives with a valid `HEARTBEAT` message, a new `VehicleState` context is dynamically instantiated in the routing table.
2. **Endpoint Binding:** The routing table binds each `sysid` to its originating physical endpoint (e.g., remote IP `192.168.10.150` and UDP port `14555`). All outgoing commands targeting that `sysid` are routed exclusively to that endpoint.
3. **No Broadcast Commands:** Operational flight commands (`ARM`, `TAKEOFF`, `SET_MODE`, `RTL`) are **never** broadcast (`sysid: 0`). They are strictly unicast to the specific target system ID.

---

## 3. Vehicle Connection Lifecycle State Machine

Each discovered vehicle is tracked through an explicit state machine:

```mermaid
stateDiagram-v2
    [*] --> DISCOVERED: Valid HEARTBEAT Received
    DISCOVERED --> CONNECTING: Request Autopilot Capabilities (AUTOPILOT_VERSION)
    CONNECTING --> IDENTIFIED: Capabilities & Protocol Received
    IDENTIFIED --> STREAMING_TELEMETRY: Request Data Streams (SET_MESSAGE_INTERVAL)
    STREAMING_TELEMETRY --> LOST_HEARTBEAT: No Heartbeat for > 3000ms
    LOST_HEARTBEAT --> STREAMING_TELEMETRY: Heartbeat Restored (< 10000ms)
    LOST_HEARTBEAT --> DISCONNECTED: No Heartbeat for > 10000ms
    DISCONNECTED --> CONNECTING: Heartbeat Resumed
    DISCONNECTED --> [*]: Purged from Active Fleet
```

### 3.1 State Definitions
- **`DISCOVERED`:** First valid `HEARTBEAT` (Msg 0) packet received from an unknown `sysid`. GCS registers presence and extracts vehicle type (`MAV_TYPE_QUADROTOR`, `MAV_TYPE_FIXED_WING`) and autopilot brand (`MAV_AUTOPILOT_PX4` or `MAV_AUTOPILOT_ARDUPILOTMEGA`).
- **`CONNECTING`:** GCS transmits `MAV_CMD_REQUEST_MESSAGE` for `AUTOPILOT_VERSION` (Msg 148) to discover firmware capabilities, UID, and flight limits.
- **`IDENTIFIED`:** Vehicle hardware profile resolved and persisted in PostgreSQL `vehicles` table.
- **`STREAMING_TELEMETRY`:** Operating state. GCS requests high-frequency streams:
  - Attitude (`ATTITUDE`, Msg 30): 30 Hz
  - Global Position (`GLOBAL_POSITION_INT`, Msg 33): 10 Hz
  - Flight Instruments (`VFR_HUD`, Msg 74): 10 Hz
  - System Status / Battery (`SYS_STATUS`, Msg 1): 2 Hz
  - GPS Diagnostics (`GPS_RAW_INT`, Msg 24): 2 Hz
- **`LOST_HEARTBEAT`:** No heartbeat received for > 3.0 seconds. The GCS raises an immediate visual and acoustic warning to operators ("Telemetry Link Degraded").
- **`DISCONNECTED`:** No heartbeat received for > 10.0 seconds. Link is flagged offline; active flight control leases are revoked.

---

## 4. Flight Command & Acknowledgement (ACK) Lifecycle

All ground-to-air commands are executed through a robust transactional handshake:

```mermaid
sequenceDiagram
    autonumber
    participant UI as Operator UI
    participant Backend as NestJS CommandsService
    participant FC as Flight-Core Daemon
    participant Vehicle as Airborne Autopilot (PX4 / ArduPilot)

    UI->>Backend: POST /api/v1/vehicles/1/arm
    Note right of Backend: Validates JWT & Control Lease
    Backend->>FC: Dispatch MAV_CMD_COMPONENT_ARM_DISARM (Param1 = 1)
    FC->>Vehicle: MAVLink COMMAND_LONG (target_system = 1, command = 400)
    
    Note over FC,Vehicle: Wait for COMMAND_ACK (Timeout = 3000ms)
    
    alt Happy Path: Command Accepted
        Vehicle-->>FC: COMMAND_ACK (command = 400, result = MAV_RESULT_ACCEPTED)
        FC-->>Backend: Command Success Event
        Backend-->>UI: 200 OK { success: true, message: "Vehicle Armed" }
    else Autopilot Rejection (e.g. Pre-Arm Safety Check Failed)
        Vehicle-->>FC: COMMAND_ACK (command = 400, result = MAV_RESULT_DENIED)
        FC-->>Backend: Command Rejected Event
        Backend-->>UI: 400 Bad Request { success: false, error: "Arming Denied: Check Gyro Calibration" }
    else Radio Packet Loss: Retry Logic
        Note over FC: 3000ms Timeout elapsed with no ACK
        FC->>Vehicle: Retry 1: MAVLink COMMAND_LONG (command = 400)
        Vehicle-->>FC: COMMAND_ACK (result = MAV_RESULT_ACCEPTED)
        FC-->>Backend: Command Success Event
        Backend-->>UI: 200 OK { success: true }
    end
```

---

## 5. MAVLink Mission Protocol Implementation

Waypoint mission uploads follow the official MAVLink Mission Protocol state machine:

```mermaid
sequenceDiagram
    autonumber
    participant Backend as NestJS MissionsService
    participant FC as Flight-Core Gateway
    participant Vehicle as Autopilot (Mission Subsystem)

    Backend->>FC: Upload Mission (N = 5 Waypoints)
    FC->>Vehicle: MISSION_COUNT (target_system = 1, count = 5)
    
    loop For each waypoint (seq = 0 to 4)
        Vehicle->>FC: MISSION_REQUEST_INT (seq = i)
        FC->>Vehicle: MISSION_ITEM_INT (seq = i, lat, lon, alt, frame, command)
    end

    Vehicle->>FC: MISSION_ACK (type = MAV_MISSION_ACCEPTED)
    FC-->>Backend: Mission Upload Success
    Backend-->>Backend: Mark Mission Active in PostgreSQL
```

### 5.1 Mission Safety Rules:
1. **Coordinate Frame:** Always use `MAV_FRAME_GLOBAL_RELATIVE_ALT_INT` (WGS84 lat/lon scaled by 1e7, altitude in millimeters above ground takeoff elevation).
2. **Terrain Clearance:** Waypoints are validated against a Digital Elevation Model (DEM) before transmission to prevent CFIT (Controlled Flight Into Terrain).
3. **Emergency Rally Points:** Every mission plan includes pre-computed emergency rally points and automatic geofence inclusion polygons.

