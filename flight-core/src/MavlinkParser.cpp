#include "MavlinkParser.hpp"
#include <iostream>
#include <chrono>
#include <cstring>
#include <cmath>

namespace fireblade {

static const double RAD_TO_DEG = 180.0 / 3.14159265358979323846;

MavlinkParser::MavlinkParser() : callback_(nullptr) {}

void MavlinkParser::setTelemetryCallback(TelemetryCallback callback) {
    callback_ = callback;
}

void MavlinkParser::parseBuffer(const uint8_t* buffer, size_t length) {
    if (length < 8) return;

    for (size_t i = 0; i < length; ++i) {
        // MAVLink v2 framing (Magic: 0xFD)
        if (buffer[i] == 0xFD && (i + 10) <= length) {
            uint8_t payloadLen = buffer[i + 1];
            size_t totalLen = 10 + payloadLen + 2; // Header + payload + 2 checksum bytes
            if (i + totalLen > length) continue;

            uint8_t sysId = buffer[i + 5];
            uint8_t compId = buffer[i + 6];
            uint32_t msgId = buffer[i + 7] | (buffer[i + 8] << 8) | (buffer[i + 9] << 16);
            const uint8_t* payload = buffer + i + 10;

            // Filter out GCS (SysID 255) and invalid broadcast (SysID 0)
            if (sysId == 255 || sysId == 0) {
                i += totalLen - 1;
                continue;
            }

            ParsedTelemetry telem{};
            telem.sysId = sysId;
            telem.compId = compId;
            telem.msgId = msgId;
            telem.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()).count();

            // Decode core ArduPilot MAVLink messages
            if (msgId == 0) { // HEARTBEAT
                uint8_t baseMode = payload[6];
                telem.armed = (baseMode & 128) != 0; // MAV_MODE_FLAG_SAFETY_ARMED
            } else if (msgId == 30) { // ATTITUDE
                float rollRad, pitchRad, yawRad;
                std::memcpy(&rollRad, payload + 4, 4);
                std::memcpy(&pitchRad, payload + 8, 4);
                std::memcpy(&yawRad, payload + 12, 4);
                telem.roll = (float)(rollRad * RAD_TO_DEG);
                telem.pitch = (float)(pitchRad * RAD_TO_DEG);
                telem.yaw = (float)(yawRad * RAD_TO_DEG);
            } else if (msgId == 33) { // GLOBAL_POSITION_INT
                int32_t latE7, lonE7, altMm, relAltMm;
                std::memcpy(&latE7, payload + 4, 4);
                std::memcpy(&lonE7, payload + 8, 4);
                std::memcpy(&altMm, payload + 12, 4);
                std::memcpy(&relAltMm, payload + 16, 4);
                telem.latitude = latE7 / 1e7;
                telem.longitude = lonE7 / 1e7;
                telem.altitudeMsl = altMm / 1000.0f;
                telem.altitudeAgl = relAltMm / 1000.0f;
            } else if (msgId == 74) { // VFR_HUD
                float gs, climb;
                int16_t hdg;
                std::memcpy(&gs, payload + 4, 4);
                std::memcpy(&hdg, payload + 8, 2);
                std::memcpy(&climb, payload + 12, 4);
                telem.groundSpeed = gs;
                telem.climbRate = climb;
                telem.yaw = (float)hdg;
            } else if (msgId == 1) { // SYS_STATUS
                uint16_t voltage;
                int8_t remaining;
                std::memcpy(&voltage, payload + 14, 2);
                remaining = (int8_t)payload[16];
                telem.batteryVoltage = voltage / 1000.0f;
                telem.batteryPct = (float)remaining;
            }

            if (callback_) {
                callback_(telem);
            }
            i += totalLen - 1;
        }
        // MAVLink v1 framing (Magic: 0xFE)
        else if (buffer[i] == 0xFE && (i + 6) <= length) {
            uint8_t payloadLen = buffer[i + 1];
            size_t totalLen = 6 + payloadLen + 2;
            if (i + totalLen > length) continue;

            uint8_t sysId = buffer[i + 3];
            uint8_t compId = buffer[i + 4];
            uint8_t msgId = buffer[i + 5];

            // Filter out GCS (SysID 255) and invalid broadcast (SysID 0)
            if (sysId == 255 || sysId == 0) {
                i += totalLen - 1;
                continue;
            }

            ParsedTelemetry telem{};
            telem.sysId = sysId;
            telem.compId = compId;
            telem.msgId = msgId;
            telem.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()).count();

            if (callback_) {
                callback_(telem);
            }
            i += totalLen - 1;
        }
    }
}

} // namespace fireblade
