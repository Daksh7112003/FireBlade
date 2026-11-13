const http = require('http');
const dgram = require('dgram');

const HTTP_PORT = 3001;
const UDP_PORT = 14550;

// In-memory latest telemetry state
let latestTelemetry = {
  sysId: 1,
  timestamp: Date.now(),
  pitch: 0.0,
  roll: 0.0,
  yaw: 0.0,
  latitude: 37.7749,
  longitude: -122.4194,
  altitudeMsl: 10.0,
  altitudeAgl: 0.0,
  groundSpeed: 0.0,
  climbRate: 0.0,
  batteryPct: 100,
  batteryVoltage: 25.2,
  flightMode: 'DISARMED',
  armed: false,
};

let seq = 0;
const clients = new Set();

// 1. Create HTTP Server for SSE & Control API
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // SSE Telemetry Stream
  if (urlPath === '/stream') {
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

  // Vehicle Arm / Disarm API: POST /api/vehicles/:id/arm
  if (req.method === 'POST' && urlPath.match(/\/api\/vehicles\/[^/]+\/arm/)) {
    const id = urlPath.split('/')[3] || '1';
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const arm = data.arm !== false;
        sendArm(id, arm, true);
        latestTelemetry.armed = arm;
        latestTelemetry.flightMode = arm ? 'ARMED' : 'DISARMED';
        broadcastTelemetry(latestTelemetry);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, status: arm ? 'ARMED' : 'DISARMED', vehicleId: id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Vehicle Takeoff API: POST /api/vehicles/:id/takeoff
  if (req.method === 'POST' && urlPath.match(/\/api\/vehicles\/[^/]+\/takeoff/)) {
    const id = urlPath.split('/')[3] || '1';
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const alt = Number(data.altitude) || 20.0;
        sendTakeoff(id, alt);

        latestTelemetry.armed = true;
        latestTelemetry.flightMode = 'GUIDED';
        broadcastTelemetry(latestTelemetry);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, status: 'TAKEOFF_INITIATED', altitude: alt, vehicleId: id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Vehicle Flight Mode API: POST /api/vehicles/:id/mode
  if (req.method === 'POST' && urlPath.match(/\/api\/vehicles\/[^/]+\/mode/)) {
    const id = urlPath.split('/')[3] || '1';
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        sendMode(id, data.mode);
        latestTelemetry.flightMode = (data.mode || 'GUIDED').toUpperCase();
        broadcastTelemetry(latestTelemetry);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, mode: data.mode, vehicleId: id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Vehicle RTL API: POST /api/vehicles/:id/rtl
  if (req.method === 'POST' && urlPath.match(/\/api\/vehicles\/[^/]+\/rtl/)) {
    const id = urlPath.split('/')[3] || '1';
    sendRtl(id);
    latestTelemetry.flightMode = 'RTL';
    broadcastTelemetry(latestTelemetry);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, status: 'RTL_INITIATED', vehicleId: id }));
    return;
  }

  // Vehicle Lease Management (Standalone approval)
  if (req.method === 'POST' && urlPath.includes('/lease')) {
    const id = urlPath.split('/')[3] || '1';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ granted: true, vehicleId: id, operatorId: 'admin' }));
    return;
  }

  // Mission Upload API: POST /api/missions/upload
  if (req.method === 'POST' && urlPath === '/api/missions/upload') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const waypoints = data.waypoints || [];
        console.log(`[Bridge] Uploading ${waypoints.length} waypoints to ArduPilot via MAVLink...`);

        // Send MAVLink MISSION_COUNT (Msg ID 44) to ArduPilot
        sendMissionCount(waypoints.length);

        // Stream mission items (Msg ID 73)
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
  console.log(`[Bridge] Telemetry & Control API listening at http://127.0.0.1:${HTTP_PORT}`);
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
setInterval(() => {
  try {
    // Standard MAVLink v2 GCS Heartbeat (SysID 255, CompID 190, Type 6 = MAV_TYPE_GCS)
    const hb = Buffer.from([
      0xFD, 9, 0, 0, (seq++) % 256, 255, 190, 0, 0, 0,
      0, 0, 0, 0, 6, 8, 0, 0, 3, 0x55, 0xAA
    ]);
    udp.send(hb, 0, hb.length, 14550, '127.0.0.1');

    // MAVLink v2 REQUEST_DATA_STREAM (Msg 66)
    const reqStream = Buffer.from([
      0xFD, 6, 0, 0, (seq++) % 256, 255, 190, 66, 0, 0,
      10, 0, 1, 1, 0, 1, 0x12, 0x34
    ]);
    udp.send(reqStream, 0, reqStream.length, 14550, '127.0.0.1');
  } catch (e) {
    // Ignore
  }
}, 1000);

// ==================== MAVLINK COMMAND SENDERS ====================

// MAVLink v2 COMMAND_LONG (Msg ID 76)
function sendCommandLong(command, p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0, p6 = 0, p7 = 0, targetSysId = 1) {
  const buf = Buffer.alloc(10 + 33 + 2);
  buf[0] = 0xFD; // MAVLink v2 magic
  buf[1] = 33;   // payload length
  buf[2] = 0;
  buf[3] = 0;
  buf[4] = (seq++) % 256;
  buf[5] = 255;  // GCS SysID
  buf[6] = 190;  // GCS CompID
  buf[7] = 76;   // Msg ID 76 (COMMAND_LONG)
  buf[8] = 0;
  buf[9] = 0;
  buf.writeFloatLE(p1, 10);
  buf.writeFloatLE(p2, 14);
  buf.writeFloatLE(p3, 18);
  buf.writeFloatLE(p4, 22);
  buf.writeFloatLE(p5, 26);
  buf.writeFloatLE(p6, 30);
  buf.writeFloatLE(p7, 34);
  buf.writeUInt16LE(command, 38);
  buf[40] = Number(targetSysId) || 1;
  buf[41] = 1; // target_component
  buf[42] = 0; // confirmation
  udp.send(buf, 0, buf.length, 14550, '127.0.0.1');
}

// Arm or Disarm
function sendArm(targetSysId, arm = true, force = true) {
  // Command 400: MAV_CMD_COMPONENT_ARM_DISARM
  // Param1: 1.0 = arm, 0.0 = disarm
  // Param2: 21196.0 = force arm (bypasses pre-arm checks in SITL)
  const p1 = arm ? 1.0 : 0.0;
  const p2 = (arm && force) ? 21196.0 : 0.0;
  console.log(`[Bridge] >> MAVLink COMMAND_LONG 400 (${arm ? 'ARM' : 'DISARM'}) to UAV-${targetSysId}`);
  sendCommandLong(400, p1, p2, 0, 0, 0, 0, 0, targetSysId);
}

// Set Flight Mode
function sendMode(targetSysId, modeName) {
  const modeUpper = (modeName || '').toUpperCase();
  const copterModes = {
    'STABILIZE': 0,
    'ALT_HOLD': 2,
    'AUTO': 3,
    'GUIDED': 4,
    'LOITER': 5,
    'RTL': 6,
    'LAND': 9,
  };
  const modeNum = copterModes[modeUpper] !== undefined ? copterModes[modeUpper] : 4;
  console.log(`[Bridge] >> MAVLink Mode Change to ${modeUpper} (${modeNum}) for UAV-${targetSysId}`);
  // Command 176: MAV_CMD_DO_SET_MODE, param1: 1 (MAV_MODE_FLAG_CUSTOM_MODE_ENABLED), param2: modeNum
  sendCommandLong(176, 1.0, modeNum, 0, 0, 0, 0, 0, targetSysId);
}

// Takeoff Sequence (Switch to GUIDED -> Arm -> Takeoff to altitude)
function sendTakeoff(targetSysId, altitude = 20.0) {
  console.log(`[Bridge] >> Initiating Takeoff sequence to ${altitude}m for UAV-${targetSysId}`);
  
  // 1. Switch to GUIDED mode
  sendMode(targetSysId, 'GUIDED');

  // 2. Arm vehicle
  setTimeout(() => {
    sendArm(targetSysId, true, true);
  }, 150);

  // 3. Send MAV_CMD_NAV_TAKEOFF (Command 22, param7 = target altitude)
  setTimeout(() => {
    console.log(`[Bridge] >> MAVLink COMMAND_LONG 22 (TAKEOFF) to ${altitude}m`);
    sendCommandLong(22, 0, 0, 0, 0, 0, 0, altitude, targetSysId);
  }, 400);
}

// Return To Launch
function sendRtl(targetSysId) {
  console.log(`[Bridge] >> Initiating RTL for UAV-${targetSysId}`);
  sendMode(targetSysId, 'RTL');
  sendCommandLong(20, 0, 0, 0, 0, 0, 0, 0, targetSysId);
}

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
