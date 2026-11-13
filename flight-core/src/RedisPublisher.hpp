#pragma once

#include "MavlinkParser.hpp"
#include <string>

namespace fireblade {

class RedisPublisher {
public:
    RedisPublisher(const std::string& host, int port, const std::string& password);
    ~RedisPublisher();

    bool connect();
    void publishTelemetry(const ParsedTelemetry& telem);

private:
    std::string host_;
    int port_;
    std::string password_;
    bool isConnected_;
};

} // namespace fireblade
