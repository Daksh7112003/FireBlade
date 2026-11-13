# Fireblade Ground Control Station (GCS)

[![Build Status](https://github.com/Daksh7112003/FireBlade/actions/workflows/ci.yml/badge.svg)](https://github.com/Daksh7112003/FireBlade/actions)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Architecture](https://img.shields.io/badge/Architecture-Docs%20v1.0-emerald)](docs/architecture/README.md)

**Fireblade GCS** is a centralized, IP-based, multi-UAV Ground Control Station engineered to run on a single field server and be accessed by multiple operators over a local network using standard web browsers.

---

## Key Capabilities

- **IP-Based Multi-Operator Cockpit:** Access telemetry, tactical maps, and video from any workstation browser via local IP.
- **Concurrent Multi-UAV Command:** Unified situational awareness and isolated flight command queues for up to 32 active UAVs.
- **Sub-150ms Low-Latency Video:** Zero-transcoding WebRTC (WHEP) streaming engine ingesting multi-camera airborne RTSP streams.
- **Safety-First Control Leases:** Atomic Redis-backed mutual exclusion ensures only one pilot commands a vehicle at any time.
- **MAVLink v2 Protocol Engine:** High-performance, zero-copy C++ flight communication gateway for PX4 and ArduPilot autopilots.
- **Time-Series Telemetry Hypertable:** PostgreSQL 16 + TimescaleDB partitioned telemetry storage with automated downsampling.

---

## Architecture Documentation

For complete, detailed technical architecture specifications, see [`docs/architecture/`](docs/architecture/):
- [Master Architecture Index](docs/architecture/README.md)
- [System Overview & CONOPS](docs/architecture/SYSTEM_OVERVIEW.md)
- [Directory Structure](docs/architecture/DIRECTORY_STRUCTURE.md)
- [File-by-File Source Code Specification](docs/architecture/FILE_BY_FILE_DOCUMENTATION.md)
- [Frontend React Architecture](docs/architecture/FRONTEND_ARCHITECTURE.md)
- [Backend NestJS Architecture](docs/architecture/BACKEND_ARCHITECTURE.md)
- [MAVLink & Multi-UAV Architecture](docs/architecture/MAVLINK_ARCHITECTURE.md)
- [Video Streaming (WebRTC/WHEP) Architecture](docs/architecture/VIDEO_STREAMING_ARCHITECTURE.md)
- [API & WebSocket Specification](docs/architecture/API_AND_WEBSOCKET_DOCUMENTATION.md)
- [Database Schema & ER Diagrams](docs/architecture/DATABASE_ARCHITECTURE.md)
- [Authentication & RBAC Security](docs/architecture/AUTHENTICATION_AND_SECURITY.md)
- [End-to-End Execution Workflows](docs/architecture/EXECUTION_WORKFLOWS.md)
- [Deployment & Dual-NIC Network Topology](docs/architecture/DEPLOYMENT_AND_NETWORK_ARCHITECTURE.md)
- [Technical Audit & Development Roadmap](docs/architecture/TECHNICAL_AUDIT.md)

---

## Quickstart (Development)

### Prerequisites
- Docker Engine 24+ and Docker Compose v2
- Node.js 20 LTS & npm
- CMake 3.20+ and C++17 compiler (for `flight-core`)

### Running with Docker Compose
```bash
git clone https://github.com/Daksh7112003/FireBlade.git
cd FireBlade
docker compose -f deploy/docker-compose.yml up -d
```
Then navigate to `http://localhost` or `http://<server-ip>` in your browser.

