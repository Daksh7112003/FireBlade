#include "RedisPublisher.hpp"
#include <iostream>
#include <sstream>

namespace fireblade {

RedisPublisher::RedisPublisher(const std::string& host, int port, const std::string& password)
    : host_(host), port_(port), password_(password), isConnected_(false) {}

RedisPublisher::~RedisPublisher() {}

bool RedisPublisher::connect() {
    std::cout << "[RedisPublisher] Connecting to Redis at " << host_ << ":" << port_ << std::endl;
    isConnected_ = true;
    return true;
}

void RedisPublisher::publishTelemetry(const ParsedTelemetry& telem) {
    if (!isConnected_) return;

    std::stringstream json;
    json << "{\"sysId\":" << (int)telem.sysId
         << ",\"msgId\":" << telem.msgId
         << ",\"timestamp\":" << telem.timestamp
         << ",\"pitch\":" << telem.pitch
         << ",\"roll\":" << telem.roll
         << ",\"yaw\":" << telem.yaw
         << ",\"lat\":" << telem.latitude
         << ",\"lon\":" << telem.longitude
         << ",\"altAgl\":" << telem.altitudeAgl
         << ",\"batteryPct\":" << telem.batteryPct
         << ",\"armed\":" << (telem.armed ? "true" : "false") << "}";

    // In production with hiredis: redisCommand(context, "PUBLISH telemetry:broadcast %s", json.str().c_str());
}

} // namespace fireblade

