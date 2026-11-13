cmake_minimum_required(VERSION 3.20)
project(flight-core VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Threads REQUIRED)

# Check for hiredis
find_path(HIREDIS_INCLUDE_DIR hiredis/hiredis.h)
find_library(HIREDIS_LIBRARY hiredis)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${HIREDIS_INCLUDE_DIR}
)

add_executable(flight-core
    src/main.cpp
    src/UdpConnection.cpp
    src/MavlinkParser.cpp
    src/VehicleRouter.cpp
    src/RedisPublisher.cpp
)

target_link_libraries(flight-core PRIVATE
    Threads::Threads
    ${HIREDIS_LIBRARY}
)

