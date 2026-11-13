#pragma once

#include <cstdint>
#include <string>
#include <functional>

namespace fireblade {

struct ParsedTelemetry {
    uint8_t sysId;
    uint8_t compId;
    uint32_t msgId;
    double latitude;
    double longitude;
    float altitudeMsl;
    float altitudeAgl;
    float pitch;
    float roll;
    float yaw;
    float groundSpeed;
    float climbRate;
    float batteryVoltage;
    float batteryPct;
    uint8_t flightMode;
    bool armed;
    uint64_t timestamp;
};

using TelemetryCallback = std::function<void(const ParsedTelemetry& telemetry)>;

class MavlinkParser {
public:
    MavlinkParser();
    void setTelemetryCallback(TelemetryCallback callback);
    void parseBuffer(const uint8_t* buffer, size_t length);

private:
    TelemetryCallback callback_;
};

} // namespace fireblade
