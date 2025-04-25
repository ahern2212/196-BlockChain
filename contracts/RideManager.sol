// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RideManager {
    enum RideStatus { Requested, Accepted, Started, Completed }

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
}
