// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DriverManager {
    
    struct Driver {
        string name;
        string vehicleInfo;
        string licenseNumber;
        uint totalEarnings;
        bool isRegistered;
        bool isAvailable;
        int256 latitude;
        int256 longitude;
    }

    struct Ride {
        address rider;
        string pickupLocation;
        string destination;
        uint256 fare;
        bool isCompleted;
    }

    struct ActiveRides {
        uint256[] rideIds;
        address[] riders;
        string[] pickups;
        string[] destinations;
        uint256[] fares;
    }

    mapping(address => Driver) public drivers;
    mapping(uint => Ride) public rides;
    address[] public driverList;
    uint public rideCounter;

    event DriverRegistered(address indexed driverAddress, string name);
    event DriverAvailabilityUpdated(address indexed driverAddress, bool isAvailable);
    event RideRequested(address indexed rider, string pickup, string destination);
    
    // Register a new driver
    function registerDriver(
        string memory _name,
        string memory _vehicleInfo,
        string memory _licenseNumber
    ) public {
        require(!drivers[msg.sender].isRegistered, "Driver already registered");

        // Create a new driver and store it
        drivers[msg.sender] = Driver({
            name: _name,
            vehicleInfo: _vehicleInfo,
            licenseNumber: _licenseNumber,
            totalEarnings: 0,
            isRegistered: true,
            isAvailable: false,
            latitude: 0,
            longitude: 0
        });

        driverList.push(msg.sender);
        emit DriverRegistered(msg.sender, _name);
    }

    // Check if driver is registered
    function isDriverRegistered(address _driverAddress) public view returns (bool) {
        return drivers[_driverAddress].isRegistered;
    }

    // Get driver details
    function getDriverDetails(address _driverAddress) public view returns (
        string memory name,
        string memory vehicleInfo,
        uint totalEarnings
    ) {
        Driver memory driver = drivers[_driverAddress];
        return (
            driver.name,
            driver.vehicleInfo,
            driver.totalEarnings
        );
    }

    // Request ride
    function requestRide(string memory pickup, string memory destination) public {
        rides[rideCounter] = Ride({
            rider: msg.sender,
            pickupLocation: pickup,
            destination: destination,
            fare: 0, // You can set this based on your pricing logic
            isCompleted: false
        });

        emit RideRequested(msg.sender, pickup, destination);
        rideCounter++;
    }

    // Update driver availability
    function setDriverAvailability(bool _isAvailable) public {
        require(drivers[msg.sender].isRegistered, "Driver not registered");
        drivers[msg.sender].isAvailable = _isAvailable;
        emit DriverAvailabilityUpdated(msg.sender, _isAvailable);
    }

    // Add earnings to the driver
    function addEarnings(address _driverAddress, uint _amount) public {
        require(drivers[_driverAddress].isRegistered, "Driver not registered");
        drivers[_driverAddress].totalEarnings += _amount;
    }

    // Transfer earnings to driver
    function transferEarnings(address payable _driverAddress) public {
        uint amount = drivers[_driverAddress].totalEarnings;
        require(amount > 0, "No earnings to transfer");
        require(address(this).balance >= amount, "Insufficient contract balance");

        // Transfer the earnings to the driver
        _driverAddress.transfer(amount);
        drivers[_driverAddress].totalEarnings = 0;
    }

    // Receive ether for earnings (simple deposit function)
    receive() external payable {
        // Contract can receive ether (for example, earnings from riders)
    }

    // Accept a ride
    function acceptRide(uint rideId) public {
        require(drivers[msg.sender].isRegistered, "Driver not registered");
        require(drivers[msg.sender].isAvailable, "Driver not available");
        require(!rides[rideId].isCompleted, "Ride already completed");
        
        // Mark driver as unavailable while on ride
        drivers[msg.sender].isAvailable = false;
        emit DriverAvailabilityUpdated(msg.sender, false);
    }

    // Complete a ride
    function completeRide(uint rideId) public {
        require(drivers[msg.sender].isRegistered, "Driver not registered");
        require(!rides[rideId].isCompleted, "Ride already completed");
        
        rides[rideId].isCompleted = true;
        
        // Make driver available again
        drivers[msg.sender].isAvailable = true;
        emit DriverAvailabilityUpdated(msg.sender, true);
    }

    // Get active ride requests
    function getActiveRideRequests() public view returns (ActiveRides memory) {
        uint activeCount = 0;
        
        // First count active rides
        for(uint i = 0; i < rideCounter; i++) {
            if(!rides[i].isCompleted) {
                activeCount++;
            }
        }
        
        // Create arrays with the correct size
        ActiveRides memory result;
        result.rideIds = new uint256[](activeCount);
        result.riders = new address[](activeCount);
        result.pickups = new string[](activeCount);
        result.destinations = new string[](activeCount);
        result.fares = new uint256[](activeCount);
        
        // Fill arrays with active ride data
        uint currentIndex = 0;
        for(uint i = 0; i < rideCounter; i++) {
            if(!rides[i].isCompleted) {
                result.rideIds[currentIndex] = i;
                result.riders[currentIndex] = rides[i].rider;
                result.pickups[currentIndex] = rides[i].pickupLocation;
                result.destinations[currentIndex] = rides[i].destination;
                result.fares[currentIndex] = rides[i].fare;
                currentIndex++;
            }
        }
        
        return result;
    }

    // Update driver location
    function updateDriverLocation(int256 latitude, int256 longitude) public {
        require(drivers[msg.sender].isRegistered, "Driver not registered");
        drivers[msg.sender].latitude = latitude;
        drivers[msg.sender].longitude = longitude;
    }
}