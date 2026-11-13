#include "UdpConnection.hpp"
#include <iostream>
#include <cstring>

#if defined(_WIN32)
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#endif

namespace fireblade {

UdpConnection::UdpConnection(uint16_t listenPort)
    : listenPort_(listenPort), isRunning_(false), socketFd_(-1), rxBuffer_(65536) {}

UdpConnection::~UdpConnection() {
    stopListening();
}

bool UdpConnection::initialize() {
#if defined(_WIN32)
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "[UdpConnection] Failed to initialize Winsock" << std::endl;
        return false;
    }
#endif

    socketFd_ = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (socketFd_ < 0) {
        std::cerr << "[UdpConnection] Failed to create UDP socket" << std::endl;
        return false;
    }

    // Enable SO_REUSEADDR to allow seamless port sharing and fast daemon restart
    int opt = 1;
#if defined(_WIN32)
    setsockopt(socketFd_, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));
#else
    setsockopt(socketFd_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#if defined(SO_REUSEPORT)
    setsockopt(socketFd_, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt));
#endif
#endif

    sockaddr_in bindAddr{};
    bindAddr.sin_family = AF_INET;
    bindAddr.sin_addr.s_addr = INADDR_ANY;
    bindAddr.sin_port = htons(listenPort_);

    if (bind(socketFd_, (struct sockaddr*)&bindAddr, sizeof(bindAddr)) < 0) {
        std::cerr << "[UdpConnection] Failed to bind to port " << listenPort_ << std::endl;
        return false;
    }

    std::cout << "[UdpConnection] Bound successfully to UDP port " << listenPort_ << " (ArduPilot/PX4 ready)" << std::endl;
    return true;
}

void UdpConnection::setPacketCallback(PacketCallback callback) {
    callback_ = callback;
}

void UdpConnection::startListening() {
    isRunning_ = true;
    sockaddr_in clientAddr{};
    socklen_t addrLen = sizeof(clientAddr);

    while (isRunning_) {
        int bytesRead = recvfrom(socketFd_, (char*)rxBuffer_.data(), (int)rxBuffer_.size(), 0,
                                 (struct sockaddr*)&clientAddr, &addrLen);
        if (bytesRead > 0 && callback_) {
            char ipStr[INET_ADDRSTRLEN];
            inet_ntop(AF_INET, &(clientAddr.sin_addr), ipStr, INET_ADDRSTRLEN);
            uint16_t port = ntohs(clientAddr.sin_port);
            callback_(rxBuffer_.data(), (size_t)bytesRead, std::string(ipStr), port);
        }
    }
}

void UdpConnection::stopListening() {
    isRunning_ = false;
    if (socketFd_ >= 0) {
#if defined(_WIN32)
        closesocket(socketFd_);
        WSACleanup();
#else
        close(socketFd_);
#endif
        socketFd_ = -1;
    }
}

bool UdpConnection::sendPacket(const uint8_t* data, size_t length, const std::string& targetIp, uint16_t targetPort) {
    if (socketFd_ < 0) return false;

    sockaddr_in destAddr{};
    destAddr.sin_family = AF_INET;
    destAddr.sin_port = htons(targetPort);
    inet_pton(AF_INET, targetIp.c_str(), &destAddr.sin_addr);

    int sent = sendto(socketFd_, (const char*)data, (int)length, 0,
                      (struct sockaddr*)&destAddr, sizeof(destAddr));
    return sent == (int)length;
}

} // namespace fireblade
