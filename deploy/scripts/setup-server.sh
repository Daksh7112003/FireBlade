#!/bin/bash
# Server configuration script for Ubuntu 22.04/24.04 LTS host

echo "=== Fireblade GCS Host Server Optimization ==="

# 1. Enable IP Forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# 2. Increase UDP Socket Buffer Sizes for MAVLink & WebRTC
sudo sysctl -w net.core.rmem_max=26214400
sudo sysctl -w net.core.rmem_default=26214400
sudo sysctl -w net.core.wmem_max=26214400
sudo sysctl -w net.core.wmem_default=26214400

# 3. Configure UFW Firewall
sudo ufw allow 80/tcp comment 'Fireblade Web Client'
sudo ufw allow 443/tcp comment 'Fireblade HTTPS Client'
sudo ufw allow 8554/tcp comment 'Airborne RTSP Ingress'
sudo ufw allow 8555/udp comment 'WebRTC Media SRTP'
sudo ufw allow 14550/udp comment 'MAVLink Telemetry & Flight Control'

echo "Host configuration applied."
