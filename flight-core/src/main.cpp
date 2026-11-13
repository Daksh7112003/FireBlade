#include <iostream>
#include <thread>
#include <chrono>
#include "UdpConnection.hpp"
#include "MavlinkParser.hpp"
#include "VehicleRouter.hpp"
#include "RedisPublisher.hpp"

int main(int argc, char* argv[]) {
    std::cout << "========================================" << std::endl;
    std::cout << "Fireblade GCS - Flight Core Daemon v1.0" << std::endl;
    std::cout << "========================================" << std::endl;

    uint16_t listenPort = 14550;
    std::string redisHost = "127.0.0.1";
    int redisPort = 6379;

    fireblade::UdpConnection udp(listenPort);
    fireblade::MavlinkParser parser;
    fireblade::VehicleRouter router;
    fireblade::RedisPublisher redis(redisHost, redisPort, "");

    if (!udp.initialize()) {
        std::cerr << "[Main] Failed to initialize UDP listener on port " << listenPort << std::endl;
        return 1;
    }

    redis.connect();

    // Wire callbacks
    udp.setPacketCallback([&](const uint8_t* data, size_t length, const std::string& senderIp, uint16_t senderPort) {
        parser.parseBuffer(data, length);
    });

    parser.setTelemetryCallback([&](const fireblade::ParsedTelemetry& telem) {
        router.updateEndpoint(telem.sysId, "127.0.0.1", 14550);
        redis.publishTelemetry(telem);
    });

    // Start background timeout monitor thread
    std::thread timeoutThread([&router]() {
        while (true) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
            router.checkTimeouts(3000); // 3-second heartbeat timeout
        }
    });
    timeoutThread.detach();

    std::cout << "[Main] Flight core daemon listening for MAVLink v2 packets..." << std::endl;
    udp.startListening();

    return 0;
}
