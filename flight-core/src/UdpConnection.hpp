#pragma once

#include <cstdint>
#include <string>
#include <functional>
#include <vector>

namespace fireblade {

using PacketCallback = std::function<void(const uint8_t* data, size_t length, const std::string& senderIp, uint16_t senderPort)>;

class UdpConnection {
public:
    UdpConnection(uint16_t listenPort);
    ~UdpConnection();

    bool initialize();
    void setPacketCallback(PacketCallback callback);
    void startListening();
    void stopListening();

    bool sendPacket(const uint8_t* data, size_t length, const std::string& targetIp, uint16_t targetPort);

private:
    uint16_t listenPort_;
    bool isRunning_;
    int socketFd_;
    PacketCallback callback_;
    std::vector<uint8_t> rxBuffer_;
};

} // namespace fireblade

