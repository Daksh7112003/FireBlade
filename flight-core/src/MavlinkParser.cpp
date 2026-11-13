#include "MavlinkParser.hpp"
#include <iostream>
#include <chrono>

namespace fireblade {

MavlinkParser::MavlinkParser() : callback_(nullptr) {}

void MavlinkParser::setTelemetryCallback(TelemetryCallback callback) {
    callback_ = callback;
}

void MavlinkParser::parseBuffer(const uint8_t* buffer, size_t length) {
    if (length < 10) return;

    // Fast header inspection for MAVLink v2 (magic byte 0xFD) or v1 (0xFE)
    for (size_t i = 0; i < length - 10; ++i) {
        if (buffer[i] == 0xFD) {
            uint8_t payloadLen = buffer[i + 1];
            uint8_t sysId = buffer[i + 5];
            uint8_t compId = buffer[i + 6];
            uint32_t msgId = buffer[i + 7] | (buffer[i + 8] << 8) | (buffer[i + 9] << 16);

            ParsedTelemetry telem{};
            telem.sysId = sysId;
            telem.compId = compId;
            telem.msgId = msgId;
            telem.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()).count();

            // Notify router
            if (callback_) {
                callback_(telem);
            }
            break;
        }
    }
}

} // namespace fireblade
