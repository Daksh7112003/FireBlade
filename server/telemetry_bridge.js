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

// 1. Create HTTP Server (SSE stream & Mission Upload API)
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // SSE Stream
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

  // Mission Upload API
  if (req.method === 'POST' && req.url === '/api/missions/upload') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const waypoints = data.waypoints || [];
        console.log(`[Bridge] Uploading ${waypoints.length} waypoints to ArduPilot via MAVLink...`);

        // Send MAVLink MISSION_COUNT (Msg ID 44) to ArduPilot
        sendMissionCount(waypoints.length);

        // Also stream mission items
        for (let i = 0; i < waypoints.length; i++) {
          sendMissionItem(i, waypoints[i]);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          count: waypoints.length,
          message: `Successfully uploaded ${waypoints.length} waypoints to UAV-1`,
          timestamp: Date.now()
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'OK', telemetry: latestTelemetry }));
});

server.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[Bridge] Telemetry & Mission API listening at http://127.0.0.1:${HTTP_PORT}`);
});

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

// Periodic 1Hz Heartbeat & Data Stream Request to ArduPilot
let seq = 0;
setInterval(() => {
  try {
    const hb = Buffer.from([
      0xFD, 9, 0, 0, (seq++) % 256, 255, 190, 0, 0, 0,
      0, 0, 0, 0, 6, 8, 0, 4, 3, 0x50, 0x55
    ]);
    udp.send(hb, 0, hb.length, 14550, '127.0.0.1');

    const reqStream = Buffer.from([
      0xFD, 6, 0, 0, (seq++) % 256, 255, 190, 66, 0, 0,
      10, 0, 1, 1, 0, 1, 0x12, 0x34
    ]);
    udp.send(reqStream, 0, reqStream.length, 14550, '127.0.0.1');
  } catch (e) {
    // Ignore
  }
}, 1000);

// MAVLink Mission Helpers
function sendMissionCount(count) {
  // MAVLink v2 MISSION_COUNT (Msg ID 44)
  const buf = Buffer.alloc(10 + 4 + 2);
  buf[0] = 0xFD;
  buf[1] = 4; // payload length
  buf[4] = (seq++) % 256;
  buf[5] = 255; // GCS SysID
  buf[6] = 190; // GCS CompID
  buf[7] = 44; // Msg ID 44 (MISSION_COUNT)
  buf.writeUInt16LE(count, 10); // count
  buf[12] = 1; // target_system
  buf[13] = 1; // target_component
  udp.send(buf, 0, buf.length, 14550, '127.0.0.1');
}

function sendMissionItem(seqIndex, wp) {
  // MAVLink v2 MISSION_ITEM_INT (Msg ID 73)
  const buf = Buffer.alloc(10 + 38 + 2);
  buf[0] = 0xFD;
  buf[1] = 38; // payload length
  buf[4] = (seq++) % 256;
  buf[5] = 255;
  buf[6] = 190;
  buf[7] = 73; // Msg ID 73
  buf.writeFloatLE(0, 10); // param1
  buf.writeFloatLE(0, 14); // param2
  buf.writeFloatLE(0, 18); // param3
  buf.writeFloatLE(0, 22); // param4
  buf.writeInt32LE(Math.round(wp.lat * 1e7), 26); // x (latitude)
  buf.writeInt32LE(Math.round(wp.lon * 1e7), 30); // y (longitude)
  buf.writeFloatLE(wp.alt || 30.0, 34); // z (altitude)
  buf.writeUInt16LE(seqIndex, 38); // seq
  buf.writeUInt16LE(wp.cmd === 'TAKEOFF' ? 22 : (wp.cmd === 'RTL' ? 20 : 16), 40); // command
  buf[42] = 1; // target_system
  buf[43] = 1; // target_component
  buf[44] = 3; // frame = MAV_FRAME_GLOBAL_RELATIVE_ALT
  buf[45] = seqIndex === 0 ? 1 : 0; // current
  buf[46] = 1; // autocontinue
  udp.send(buf, 0, buf.length, 14550, '127.0.0.1');
}

// MAVLink Ingestion Parser
function parseMavlink(buf, rinfo) {
  const len = buf.length;
  for (let i = 0; i < len - 10; i++) {
    if (buf[i] === 0xFD) {
      const payloadLen = buf[i + 1];
      const sysId = buf[i + 5];
      const msgId = buf[i + 7] | (buf[i + 8] << 8) | (buf[i + 9] << 16);
      const payloadStart = i + 10;

      // Filter out GCS (SysID 255) and invalid broadcast (SysID 0)
      if (sysId === 255 || sysId === 0) {
        i += 10 + payloadLen + 2;
        continue;
      }

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

  if (msgId === 0 && payload.length >= 7) {
    const baseMode = payload.readUInt8(6);
    latestTelemetry.armed = (baseMode & 128) !== 0;
    latestTelemetry.flightMode = latestTelemetry.armed ? 'ARMED' : 'DISARMED';
    changed = true;
  } else if (msgId === 30 && payload.length >= 16) {
    const rollRad = payload.readFloatLE(4);
    const pitchRad = payload.readFloatLE(8);
    const yawRad = payload.readFloatLE(12);
    latestTelemetry.roll = Number((rollRad * 180 / Math.PI).toFixed(2));
    latestTelemetry.pitch = Number((pitchRad * 180 / Math.PI).toFixed(2));
    latestTelemetry.yaw = Number((yawRad * 180 / Math.PI).toFixed(2));
    changed = true;
  } else if (msgId === 33 && payload.length >= 20) {
    latestTelemetry.latitude = payload.readInt32LE(4) / 1e7;
    latestTelemetry.longitude = payload.readInt32LE(8) / 1e7;
    latestTelemetry.altitudeMsl = Number((payload.readInt32LE(12) / 1000).toFixed(1));
    latestTelemetry.altitudeAgl = Number((payload.readInt32LE(16) / 1000).toFixed(1));
    changed = true;
  } else if (msgId === 74 && payload.length >= 16) {
    latestTelemetry.groundSpeed = Number(payload.readFloatLE(4).toFixed(1));
    latestTelemetry.yaw = payload.readInt16LE(8);
    latestTelemetry.climbRate = Number(payload.readFloatLE(12).toFixed(1));
    changed = true;
  } else if (msgId === 1 && payload.length >= 17) {
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
