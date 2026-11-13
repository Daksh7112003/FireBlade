#pragma once

#include "MavlinkParser.hpp"
#include <unordered_map>
#include <string>
#include <mutex>

namespace fireblade {

struct VehicleSession {
    uint8_t sysId;
    std::string ipAddress;
    uint16_t port;
    uint64_t lastHeartbeat;
    bool isActive;
};

class VehicleRouter {
public:
    VehicleRouter();
    void updateEndpoint(uint8_t sysId, const std::string& ip, uint16_t port);
    bool getEndpoint(uint8_t sysId, std::string& outIp, uint16_t& outPort);
    void checkTimeouts(uint64_t timeoutMs);

private:
    std::mutex mutex_;
    std::unordered_map<uint8_t, VehicleSession> sessions_;
};

} // namespace fireblade
