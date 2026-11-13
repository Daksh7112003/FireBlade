# Deployment & Network Architecture Specification
## Fireblade Ground Control Station (GCS)

---

### Document Metadata
- **Target OS:** Ubuntu Linux 22.04 LTS / 24.04 LTS Server
- **Container Runtime:** Docker Engine 24+ & Docker Compose v2
- **Network Topology:** Dual-Homed Server Architecture (Tactical UAV Subnet + Operator LAN Subnet)

---

## 1. Physical Hardware & Server Specifications

The Fireblade GCS server is engineered to run on a single ruggedized industrial PC or field server installed in a mobile command vehicle:

| Component | Minimum Specification (8 Active UAVs) | Recommended Specification (32 Active UAVs) |
| :--- | :--- | :--- |
| **CPU** | 8 Cores / 16 Threads (Intel Core i7-11700 or AMD Ryzen 7 5700X) | 16 Cores / 32 Threads (Intel Xeon E-2388G or AMD Ryzen 9 7900X) |
| **RAM** | 32 GB DDR4 ECC (3200 MHz) | 64 GB DDR5 (4800 MHz) |
| **Storage** | 1 TB NVMe M.2 SSD (PCIe 3.0) | 2 TB NVMe M.2 SSD (PCIe 4.0, Read: 7000 MB/s) |
| **GPU (Hardware Video)** | Intel Iris Xe / Nvidia GTX 1650 (NVENC support) | Nvidia RTX 4060 / A2000 (Multi-Stream NVDEC/NVENC) |
| **Network Interfaces** | 2x Gigabit Ethernet (Intel i210/i225) | 4x 2.5GbE / 10GbE Ethernet Ports |

---

## 2. Dual-Homed Network Topology

To ensure strict security and prevent video stream congestion from impacting operator interfaces, the server employs two physically isolated network interfaces:

```mermaid
flowchart TD
    subgraph AirNetwork["Subnet A: Tactical UAV Radio Network (192.168.10.0/24)"]
        UAV1["UAV Alpha<br/>IP: 192.168.10.101"]
        UAV2["UAV Bravo<br/>IP: 192.168.10.102"]
        RADIO_GATEWAY["Tactical Mesh Radio Master<br/>(Silvus / Microhard / RFD900)"]
    end

    subgraph ServerHost["Fireblade GCS Server Host (Ubuntu Linux)"]
        direction TB
        NIC1["NIC 1 (eth0 - UAV Radio Link)<br/>IP: 192.168.10.10"]
        NIC2["NIC 2 (eth1 - Operator LAN)<br/>IP: 192.168.1.50"]
        
        subgraph Containers["Docker Container Network (bridge: 172.20.0.0/16)"]
            FC["flight-core<br/>(host net: 14550)"]
            MMTX["mediamtx<br/>(host net: 8554, 8555)"]
            NEST["backend-api<br/>(172.20.0.5:3000)"]
            NGINX["nginx-ingress<br/>(172.20.0.10:80, 443)"]
            REDIS["redis-cache<br/>(172.20.0.2:6379)"]
            PG["postgres-db<br/>(172.20.0.3:5432)"]
        end
    end

    subgraph OperatorNetwork["Subnet B: Operator LAN / Wi-Fi (192.168.1.0/24)"]
        SWITCH["Gigabit LAN Switch / Wi-Fi 6 AP"]
        STATION1["Commander Laptop<br/>http://192.168.1.50"]
        STATION2["Pilot Station 1<br/>http://192.168.1.50"]
        STATION3["Payload Specialist<br/>http://192.168.1.50"]
    end

    UAV1 & UAV2 --> RADIO_GATEWAY
    RADIO_GATEWAY ===|Ethernet / UDP| NIC1
    NIC1 --> FC
    NIC1 --> MMTX

    NIC2 ===|Ethernet| SWITCH
    SWITCH <--> STATION1 & STATION2 & STATION3
    NIC2 <--> NGINX
```

---

## 3. Firewall & Port Mapping Matrix

| Port | Protocol | Interface | Container / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **80** | TCP | `eth1` (Operator LAN) | `nginx-ingress` | HTTP Web Client Ingress (Redirect to HTTPS) |
| **443** | TCP | `eth1` (Operator LAN) | `nginx-ingress` | HTTPS Secure Web Client & WebSocket Ingress |
| **8554** | TCP / UDP | `eth0` (UAV Radio) | `mediamtx` | Airborne RTSP Video Ingestion |
| **8555** | UDP | `eth1` (Operator LAN) | `mediamtx` | WebRTC Media Transport (SRTP) to Browsers |
| **8889** | TCP | Internal Only | `mediamtx` | WebRTC WHEP HTTP Signaling (Proxied by Nginx) |
| **14550** | UDP | `eth0` (UAV Radio) | `flight-core` | MAVLink v2 Telemetry & Flight Control |
| **3000** | TCP | Internal Only | `backend-api` | NestJS Core Application Port |
| **6379** | TCP | `127.0.0.1` Only | `redis-cache` | In-Memory Message Broker & Locks |
| **5432** | TCP | `127.0.0.1` Only | `postgres-db` | Relational & TimescaleDB Persistence |

---

## 4. Production Docker Compose Architecture

```yaml
# deploy/docker-compose.yml
version: '3.8'

networks:
  fireblade-internal:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    container_name: fireblade-postgres
    restart: always
    environment:
      POSTGRES_DB: fireblade
      POSTGRES_USER: fireblade_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init-db.sh:/docker-entrypoint-initdb.d/init.sh:ro
    networks:
      - fireblade-internal

  redis:
    image: redis:7.2-alpine
    container_name: fireblade-redis
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redisdata:/data
    networks:
      - fireblade-internal

  flight-core:
    build:
      context: ../flight-core
      dockerfile: ../deploy/docker/Dockerfile.flight-core
    container_name: fireblade-flight-core
    restart: always
    network_mode: "host" # Requires direct binding for UDP 14550
    environment:
      REDIS_HOST: 127.0.0.1
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      MAVLINK_LISTEN_PORT: 14550

  mediamtx:
    image: bluenviron/mediamtx:latest
    container_name: fireblade-mediamtx
    restart: always
    network_mode: "host" # High-throughput UDP 8555 WebRTC
    volumes:
      - ./mediamtx/mediamtx.yml:/mediamtx.yml:ro

  backend:
    build:
      context: ../server
      dockerfile: ../deploy/docker/Dockerfile.backend
    container_name: fireblade-backend
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://fireblade_admin:${DB_PASSWORD}@postgres:5432/fireblade
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - fireblade-internal

  frontend:
    build:
      context: ../client
      dockerfile: ../deploy/docker/Dockerfile.frontend
    container_name: fireblade-frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - backend
    networks:
      - fireblade-internal

volumes:
  pgdata:
  redisdata:
```

