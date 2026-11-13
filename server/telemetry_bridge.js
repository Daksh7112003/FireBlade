const dgram = require('dgram');
const http = require('http');

const UDP_PORT = 14550;
const HTTP_PORT = 3001;

// Latest telemetry cache
let latestTelemetry = {
  sysId: 1,
  pitch: 0,
  roll: 0,
  yaw: 0,
  latitude: 37.7749,
  longitude: -122.4194,
  altitudeMsl: 0,
  altitudeAgl: 0,
  groundSpeed: 0,
  climbRate: 0,
  batteryPct: 100,
  batteryVoltage: 24.0,
  flightMode: 'LOITER',
  armed: false,
};

// Connected SSE clients
const clients = new Set();

// 1. Create HTTP SSE Server on port 3001
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    clients.add(res);
    res.write(`data: ${JSON.stringify(latestTelemetry)}\n\n`);

    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'OK', telemetry: latestTelemetry }));
});

server.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[Bridge] Telemetry SSE Server listening at http://127.0.0.1:${HTTP_PORT}/stream`);
});

// Broadcast helper
function broadcastTelemetry(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

// 2. Create UDP Socket on port 14550
const udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });

udp.on('error', (err) => {
  console.error(`[Bridge] UDP error: ${err.message}`);
});

udp.on('message', (msg, rinfo) => {
  parseMavlink(msg, rinfo);
});

udp.bind(UDP_PORT, () => {
  console.log(`[Bridge] Bound to UDP port ${UDP_PORT} (listening for ArduPilot/PX4)`);
});

// 3. Periodic 1Hz Heartbeat & Data Stream Request to ArduPilot
let seq = 0;
setInterval(() => {
  try {
    // Standard MAVLink v2 GCS Heartbeat
    const hb = Buffer.from([
      0xFD, 9, 0, 0, (seq++) % 256, 255, 190, 0, 0, 0,
      0, 0, 0, 0, 6, 8, 0, 4, 3, 0x50, 0x55
    ]);
    udp.send(hb, 0, hb.length, 14550, '127.0.0.1');

    // Request Data Stream (Msg ID 66) at 10Hz
    const reqStream = Buffer.from([
      0xFD, 6, 0, 0, (seq++) % 256, 255, 190, 66, 0, 0,
      10, 0, 1, 1, 0, 1, 0x12, 0x34
    ]);
    udp.send(reqStream, 0, reqStream.length, 14550, '127.0.0.1');
  } catch (e) {
    // Ignore transient send errors
  }
}, 1000);

// MAVLink Parser
function parseMavlink(buf, rinfo) {
  const len = buf.length;
  for (let i = 0; i < len - 10; i++) {
    if (buf[i] === 0xFD) { // MAVLink v2
      const payloadLen = buf[i + 1];
      const sysId = buf[i + 5];
      const msgId = buf[i + 7] | (buf[i + 8] << 8) | (buf[i + 9] << 16);
      const payloadStart = i + 10;

      if (payloadStart + payloadLen <= len) {
        const payload = buf.subarray(payloadStart, payloadStart + payloadLen);
        decodeMessage(sysId, msgId, payload);
      }
      i += 10 + payloadLen + 2;
    }
  }
}

function decodeMessage(sysId, msgId, payload) {
  let changed = false;

  if (msgId === 0 && payload.length >= 7) { // HEARTBEAT
    const baseMode = payload.readUInt8(6);
    latestTelemetry.armed = (baseMode & 128) !== 0;
    latestTelemetry.flightMode = latestTelemetry.armed ? 'ARMED' : 'DISARMED';
    changed = true;
  } else if (msgId === 30 && payload.length >= 16) { // ATTITUDE
    const rollRad = payload.readFloatLE(4);
    const pitchRad = payload.readFloatLE(8);
    const yawRad = payload.readFloatLE(12);
    latestTelemetry.roll = Number((rollRad * 180 / Math.PI).toFixed(2));
    latestTelemetry.pitch = Number((pitchRad * 180 / Math.PI).toFixed(2));
    latestTelemetry.yaw = Number((yawRad * 180 / Math.PI).toFixed(2));
    changed = true;
  } else if (msgId === 33 && payload.length >= 20) { // GLOBAL_POSITION_INT
    latestTelemetry.latitude = payload.readInt32LE(4) / 1e7;
    latestTelemetry.longitude = payload.readInt32LE(8) / 1e7;
    latestTelemetry.altitudeMsl = Number((payload.readInt32LE(12) / 1000).toFixed(1));
    latestTelemetry.altitudeAgl = Number((payload.readInt32LE(16) / 1000).toFixed(1));
    changed = true;
  } else if (msgId === 74 && payload.length >= 16) { // VFR_HUD
    latestTelemetry.groundSpeed = Number(payload.readFloatLE(4).toFixed(1));
    latestTelemetry.yaw = payload.readInt16LE(8);
    latestTelemetry.climbRate = Number(payload.readFloatLE(12).toFixed(1));
    changed = true;
  } else if (msgId === 1 && payload.length >= 17) { // SYS_STATUS
    latestTelemetry.batteryVoltage = Number((payload.readUInt16LE(14) / 1000).toFixed(1));
    latestTelemetry.batteryPct = payload.readInt8(16);
    changed = true;
  }

  if (changed) {
    latestTelemetry.sysId = sysId;
    latestTelemetry.timestamp = Date.now();
    broadcastTelemetry(latestTelemetry);
  }
}
