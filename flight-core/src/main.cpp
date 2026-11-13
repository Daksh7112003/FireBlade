#include <iostream>
#include <thread>
#include <chrono>
#include <vector>
#include "UdpConnection.hpp"
#include "MavlinkParser.hpp"
#include "VehicleRouter.hpp"
#include "RedisPublisher.hpp"

// Creates a standard MAVLink v2 GCS Heartbeat packet (SysID 255, CompID 190)
std::vector<uint8_t> createGcsHeartbeat(uint8_t seq) {
    std::vector<uint8_t> packet = {
        0xFD,               // Magic MAVLink v2
        0x09,               // Payload length (9 bytes)
        0x00,               // Incompat flags
        0x00,               // Compat flags
        seq,                // Sequence
        0xFF,               // SysID: 255 (GCS)
        0xBE,               // CompID: 190 (GCS Component)
        0x00, 0x00, 0x00,   // MsgID: 0 (HEARTBEAT)
        // Payload (9 bytes):
        0x00, 0x00, 0x00, 0x00, // custom_mode = 0
        0x06,               // type = MAV_TYPE_GCS (6)
        0x08,               // autopilot = MAV_AUTOPILOT_INVALID (8)
        0x00,               // base_mode = 0
        0x04,               // system_status = MAV_STATE_ACTIVE (4)
        0x03,               // mavlink_version = 3
        0x50, 0x55          // CRC placeholder
    };
    return packet;
}

// Creates an ArduPilot REQUEST_DATA_STREAM packet (Msg ID 66) to start 10Hz telemetry
std::vector<uint8_t> createRequestDataStream(uint8_t targetSysId, uint8_t seq) {
    std::vector<uint8_t> packet = {
        0xFD,               // Magic MAVLink v2
        0x06,               // Payload length (6 bytes)
        0x00,               // Incompat flags
        0x00,               // Compat flags
        seq,                // Sequence
        0xFF,               // SysID: 255 (GCS)
        0xBE,               // CompID: 190 (GCS Component)
        0x42, 0x00, 0x00,   // MsgID: 66 (REQUEST_DATA_STREAM)
        // Payload (6 bytes):
        0x0A, 0x00,         // req_message_rate = 10 Hz
        targetSysId,        // target_system
        0x01,               // target_component
        0x00,               // req_stream_id = MAV_DATA_STREAM_ALL (0)
        0x01,               // start_stop = 1 (start)
        0x12, 0x34          // CRC placeholder
    };
    return packet;
}

int main(int argc, char* argv[]) {
    std::cout << "========================================" << std::endl;
    std::cout << "Fireblade GCS - Flight Core Daemon v1.0" << std::endl;
    std::cout << "Target: ArduPilot & PX4 on UDP Port 14550" << std::endl;
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

    // 1Hz GCS Heartbeat & Telemetry Rate Negotiation Thread
    std::thread heartbeatThread([&udp, &router]() {
        uint8_t seq = 0;
        while (true) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
            
            // Broadcast GCS Heartbeat to 127.0.0.1:14550 for ArduPilot SITL / router
            auto hb = createGcsHeartbeat(seq++);
            udp.sendPacket(hb.data(), hb.size(), "127.0.0.1", 14550);

            // Request full data streams for known vehicles
            auto reqStream = createRequestDataStream(1, seq++);
            udp.sendPacket(reqStream.data(), reqStream.size(), "127.0.0.1", 14550);

            router.checkTimeouts(3000); // 3-second heartbeat timeout
        }
    });
    heartbeatThread.detach();

    std::cout << "[Main] Flight core daemon listening for ArduPilot packets on UDP 14550..." << std::endl;
    udp.startListening();

    return 0;
}
