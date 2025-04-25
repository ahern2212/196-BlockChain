// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RideManager {
    enum RideStatus { Requested, Accepted, Started, Completed, Declined }

    struct Ride {
        address rider;
        address driver;
        string origin;
        string destination;
        uint cost;
        RideStatus status;
    }

    uint public rideCount = 0;
    mapping(uint => Ride) public rides;
    mapping(address => uint[]) public riderRides;
    mapping(address => uint[]) public driverRides;

    event RideRequested(uint rideId, address rider, string origin, string destination, uint cost);
    event RideAccepted(uint rideId, address driver);
    event RideStarted(uint rideId);
    event RideCompleted(uint rideId);
    event RideDeclined(uint rideId, address driver);

    function requestRide(string memory origin, string memory destination, uint cost) public returns (uint) {
        Ride storage r = rides[rideCount];
        r.rider = msg.sender;
        r.origin = origin;
        r.destination = destination;
        r.cost = cost;
        r.status = RideStatus.Requested;

        riderRides[msg.sender].push(rideCount);

        emit RideRequested(rideCount, msg.sender, origin, destination, cost);
        rideCount++;
        return rideCount - 1;
    }

    function acceptRide(uint rideId) public {
        Ride storage r = rides[rideId];
        require(r.status == RideStatus.Requested, "Ride not available");
        r.driver = msg.sender;
        r.status = RideStatus.Accepted;

        driverRides[msg.sender].push(rideId);

        emit RideAccepted(rideId, msg.sender);
    }

    function startRide(uint rideId) public {
        Ride storage r = rides[rideId];
        require(msg.sender == r.driver, "Only driver can start");
        require(r.status == RideStatus.Accepted, "Ride not accepted");
        r.status = RideStatus.Started;

        emit RideStarted(rideId);
    }

    function endRide(uint rideId) public {
        Ride storage r = rides[rideId];
        require(msg.sender == r.driver, "Only driver can end");
        require(r.status == RideStatus.Started, "Ride not started");
        r.status = RideStatus.Completed;

        emit RideCompleted(rideId);
    }

    function declineRide(uint rideId) public {
        Ride storage r = rides[rideId];
        require(r.status == RideStatus.Requested, "Ride not available for declining");
        r.status = RideStatus.Declined;
        r.driver = msg.sender;

        emit RideDeclined(rideId, msg.sender);
    }

    function getRideDetails(uint rideId) public view returns (
        address, address, string memory, string memory, uint, RideStatus
    ) {
        Ride memory r = rides[rideId];
        return (r.rider, r.driver, r.origin, r.destination, r.cost, r.status);
    }

    function getActiveRides(address user) public view returns (uint[] memory) {
    if (riderRides[user].length > 0) {
        return riderRides[user];
    } else {
        return driverRides[user];
    }
}

function getActiveRideRequests() public view returns (
    uint256[] memory rideIds,
    address[] memory riders,
    string[] memory pickups,
    string[] memory destinations,
    uint256[] memory fares,
    int256[] memory pickupLats,
    int256[] memory pickupLngs
) {
    // Count pending rides first
    uint256 pendingCount = 0;
    for (uint256 i = 0; i < rideCount; i++) {
        if (rides[i].status == RideStatus.Requested) {
            pendingCount++;
        }
    }

    // Initialize arrays
    rideIds = new uint256[](pendingCount);
    riders = new address[](pendingCount);
    pickups = new string[](pendingCount);
    destinations = new string[](pendingCount);
    fares = new uint256[](pendingCount);
    pickupLats = new int256[](pendingCount);
    pickupLngs = new int256[](pendingCount);

    // Fill arrays with pending ride data
    uint256 index = 0;
    for (uint256 i = 0; i < rideCount; i++) {
        if (rides[i].status == RideStatus.Requested) {
            Ride memory r = rides[i];
            rideIds[index] = i;
            riders[index] = r.rider;
            pickups[index] = r.origin;
            destinations[index] = r.destination;
            fares[index] = r.cost;
            pickupLats[index] = 0; // Assuming pickupLat is not available in the struct
            pickupLngs[index] = 0; // Assuming pickupLng is not available in the struct
            index++;
        }
    }
}
}
