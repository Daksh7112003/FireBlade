# API & WebSocket Interface Specification
## Fireblade Ground Control Station (GCS)

---

### Document Metadata
- **Module:** Interface Specifications & Network Contracts
- **Protocols:** HTTP/1.1 REST (`/api/v1`), WebSocket (Socket.IO `/telemetry`, `/control`)
- **Format:** JSON / UTF-8
- **Authentication:** Bearer JWT in `Authorization` HTTP header or WebSocket handshake query

---

## 1. REST API Specification

### 1.1 Authentication & Operator Sessions

#### `POST /api/v1/auth/login`
- **Purpose:** Authenticates an operator station and issues a JWT token.
- **Controller / Service:** `AuthController.login()` -> `AuthService.validateUser()`
- **Frontend Caller:** `client/src/api/auth.api.ts` -> `loginOperator()`
- **Request Body:**
```json
{
  "username": "pilot_alpha",
  "password": "SecurePassword123!",
  "workstationId": "STATION_DESK_02"
}
```
- **Response Structure (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "d8a1f8e4-23b9-4a92-96b3...",
  "user": {
    "id": "usr_991823",
    "username": "pilot_alpha",
    "displayName": "Capt. Miller",
    "role": "PILOT_IN_COMMAND"
  }
}
```

---

### 1.2 Vehicle Fleet Management

#### `GET /api/v1/vehicles`
- **Purpose:** Retrieves the list of all registered and actively discovered UAVs.
- **Controller / Service:** `VehiclesController.findAll()` -> `VehiclesService.getActiveVehicles()`
- **Frontend Caller:** `client/src/api/vehicles.api.ts` -> `fetchVehicleFleet()`
- **Response Structure (200 OK):**
```json
[
  {
    "id": "uav_01",
    "sysId": 1,
    "name": "Fireblade Recon Alpha",
    "type": "QUADROTOR",
    "autopilot": "PX4",
    "firmwareVersion": "1.14.0",
    "connectionStatus": "CONNECTED",
    "lastHeartbeat": 1700000025,
    "armed": false,
    "flightMode": "HOLD",
    "batteryPercentage": 88
  }
]
```

#### `GET /api/v1/vehicles/:id`
- **Purpose:** Retrieves detailed diagnostics and parameters for a specific vehicle.
- **Parameters:** `id` (string) - Unique vehicle identifier.

---

### 1.3 Flight Command & Control Endpoints

> [!IMPORTANT]
> All flight command endpoints require an active **Control Lease** held by the authenticated operator. If the lease is held by another operator, HTTP `403 Forbidden` is returned.

#### `POST /api/v1/vehicles/:id/arm`
- **Purpose:** Arms or disarms vehicle propulsion motors.
- **Controller / Service:** `CommandsController.setArming()` -> `CommandsService.dispatchCommand()`
- **Frontend Caller:** `client/src/api/vehicles.api.ts` -> `armVehicle(id, true)`
- **Request Body:**
```json
{
  "arm": true,
  "force": false
}
```
- **Response (200 OK):**
```json
{
  "transactionId": "tx_arm_99182",
  "status": "ACCEPTED",
  "message": "Autopilot motors armed successfully"
}
```

#### `POST /api/v1/vehicles/:id/mode`
- **Purpose:** Switches autopilot flight mode.
- **Request Body:**
```json
{
  "flightMode": "AUTO_RTL"
}
```

#### `POST /api/v1/vehicles/:id/takeoff`
- **Purpose:** Commands autonomous vertical takeoff to a target altitude.
- **Request Body:**
```json
{
  "altitudeAgl": 30.0,
  "climbRate": 2.5
}
```

---

### 1.4 Operator Control Leases

#### `POST /api/v1/operators/lease-control`
- **Purpose:** Requests exclusive flight command authority over a specific UAV.
- **Controller / Service:** `CommandsController.acquireLease()` -> `LeaseService.acquireLease()`
- **Request Body:**
```json
{
  "vehicleId": "uav_01",
  "ttlSeconds": 30
}
```
- **Response (200 OK):**
```json
{
  "leaseGranted": true,
  "vehicleId": "uav_01",
  "operatorId": "usr_991823",
  "expiresAt": 1700000060
}
```

---

## 2. WebSocket Telemetry & Alert Gateway

### 2.1 Connection & Handshake
- **Endpoint:** `ws://<server-ip>/telemetry`
- **Authentication Query:** `ws://<server-ip>/telemetry?token=<JWT_TOKEN>`

### 2.2 Client-to-Server Events (Inbound)

#### `subscribe:vehicle`
- **Payload:**
```json
{
  "vehicleId": "uav_01"
}
```
- **Action:** Adds socket connection to room `uav_01`.

#### `unsubscribe:vehicle`
- **Payload:**
```json
{
  "vehicleId": "uav_01"
}
```
- **Action:** Leaves room `uav_01`.

---

### 2.3 Server-to-Client Events (Outbound Broadcasts)

#### `vehicle:telemetry:update`
- **Frequency:** Throttled to 30 Hz per subscribed vehicle.
- **Room:** `uav_{vehicleId}`
- **Payload Structure:**
```json
{
  "vehicleId": "uav_01",
  "timestamp": 1700000025120,
  "attitude": {
    "pitch": 4.25,
    "roll": -1.82,
    "yaw": 184.6
  },
  "position": {
    "latitude": 37.774929,
    "longitude": -122.419416,
    "altitudeMsl": 142.5,
    "altitudeAgl": 35.2
  },
  "velocity": {
    "vx": 8.4,
    "vy": 0.2,
    "vz": -0.1,
    "groundSpeed": 8.41,
    "climbRate": 0.1
  },
  "battery": {
    "voltage": 22.8,
    "current": 14.2,
    "remainingPercent": 84
  },
  "gps": {
    "fixType": "RTK_FIXED",
    "satellitesVisible": 18,
    "hdop": 0.8
  },
  "flight": {
    "armed": true,
    "flightMode": "AUTO_MISSION",
    "currentWaypoint": 3
  }
}
```

#### `vehicle:alert`
- **Purpose:** Emits critical system warnings and MAVLink `STATUSTEXT` notices.
- **Payload Structure:**
```json
{
  "vehicleId": "uav_01",
  "severity": "CRITICAL",
  "message": "BATTERY LEVEL LOW (< 20%) - INITIATING RTL",
  "timestamp": 1700000025190
}
```

#### `operator:control:revoked`
- **Purpose:** Notifies an operator that their flight control lease has expired or been preempted by a Commander.
- **Payload Structure:**
```json
{
  "vehicleId": "uav_01",
  "reason": "PREEMPTED_BY_COMMANDER",
  "preemptedBy": "Commander Sterling"
}
```
