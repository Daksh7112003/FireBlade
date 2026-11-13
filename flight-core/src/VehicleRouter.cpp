#include "VehicleRouter.hpp"
#include <chrono>
#include <iostream>

namespace fireblade {

VehicleRouter::VehicleRouter() {}

void VehicleRouter::updateEndpoint(uint8_t sysId, const std::string& ip, uint16_t port) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    auto it = sessions_.find(sysId);
    if (it == sessions_.end()) {
        std::cout << "[VehicleRouter] Discovered new vehicle SysID: " << (int)sysId
                  << " at " << ip << ":" << port << std::endl;
    }

    sessions_[sysId] = { sysId, ip, port, (uint64_t)now, true };
}

bool VehicleRouter::getEndpoint(uint8_t sysId, std::string& outIp, uint16_t& outPort) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = sessions_.find(sysId);
    if (it != sessions_.end() && it->second.isActive) {
        outIp = it->second.ipAddress;
        outPort = it->second.port;
        return true;
    }
    return false;
}

void VehicleRouter::checkTimeouts(uint64_t timeoutMs) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    for (auto& pair : sessions_) {
        if (pair.second.isActive && (now - pair.second.lastHeartbeat > timeoutMs)) {
            pair.second.isActive = false;
            std::cout << "[VehicleRouter] Vehicle SysID: " << (int)pair.first
                      << " lost connection (Heartbeat Timeout)" << std::endl;
        }
    }
}

} // namespace fireblade
