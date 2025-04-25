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
    }

    mapping(address => Driver) public drivers;
    address[] public driverList;

    event DriverRegistered(address indexed driverAddress, string name);
    event DriverAvailabilityUpdated(address indexed driverAddress, bool isAvailable);
    
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
            isAvailable: false
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

    // request ride
    function RideRequested(string memory pickup, string memory destination) public {
    rides[rideCounter] = Ride({
        rider: msg.sender,
        pickupLocation: pickup,
        destination: destination,
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
}