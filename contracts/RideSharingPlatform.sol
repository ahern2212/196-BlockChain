// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RideSharingPlatform {
    // ========== Data Structures ==========
    enum RideStatus { Requested, Accepted, Started, Completed, Declined }
    
    struct Driver {
        string name;
        string vehicleInfo;
        string licenseNumber;
        uint256 totalEarnings;
        bool isRegistered;
        bool isAvailable;
        int256 latitude;
        int256 longitude;
        uint256 rating;
        uint256 rideCount;
    }
    
    struct Ride {
        address rider;
        address driver;
        string origin;
        string destination;
        uint256 fare;
        RideStatus status;
        uint256 timestamp;
    }
    
    // ========== State Variables ==========
    uint256 public rideCount = 0;
    mapping(uint256 => Ride) public rides;
    mapping(address => Driver) public drivers;
    mapping(address => uint256[]) public riderRides;
    mapping(address => uint256[]) public driverRides;
    address[] public driverList;
    
    // Platform fee percentage (in basis points, 100 = 1%)
    uint256 public platformFeePercent = 500; // 5%
    address public platformWallet;
    
    // ========== Events ==========
    event DriverRegistered(address indexed driverAddress, string name);
    event DriverAvailabilityUpdated(address indexed driverAddress, bool isAvailable);
    event RideRequested(uint256 indexed rideId, address indexed rider, string origin, string destination, uint256 fare);
    event RideAccepted(uint256 indexed rideId, address indexed driver);
    event RideStarted(uint256 indexed rideId);
    event RideCompleted(uint256 indexed rideId);
    event RideDeclined(uint256 indexed rideId, address indexed driver);
    event PaymentProcessed(uint256 indexed rideId, address indexed driver, uint256 amount);
    
    // ========== Constructor ==========
    constructor() {
        platformWallet = msg.sender;
    }
    
    // ========== Driver Functions ==========
    function registerDriver(string memory _name, string memory _vehicleInfo, string memory _licenseNumber) public {
        require(!drivers[msg.sender].isRegistered, "Driver already registered");
        
        drivers[msg.sender] = Driver({
            name: _name,
            vehicleInfo: _vehicleInfo,
            licenseNumber: _licenseNumber,
            totalEarnings: 0,
            isRegistered: true,
            isAvailable: false,
            latitude: 0,
            longitude: 0,
            rating: 0,
            rideCount: 0
        });
        
        driverList.push(msg.sender);
        emit DriverRegistered(msg.sender, _name);
    }
    
    function isDriverRegistered(address _driverAddress) public view returns (bool) {
        return drivers[_driverAddress].isRegistered;
    }
    
    function getDriverDetails(address _driverAddress) public view returns (
        string memory name,
        string memory vehicleInfo,
        uint256 totalEarnings
    ) {
        Driver memory driver = drivers[_driverAddress];
        return (driver.name, driver.vehicleInfo, driver.totalEarnings);
    }
    
    function setDriverAvailability(bool _isAvailable) public {
        require(drivers[msg.sender].isRegistered, "Driver not registered");
        drivers[msg.sender].isAvailable = _isAvailable;
        emit DriverAvailabilityUpdated(msg.sender, _isAvailable);
    }
    
    function updateDriverLocation(int256 latitude, int256 longitude) public {
        require(drivers[msg.sender].isRegistered, "Driver not registered");
        drivers[msg.sender].latitude = latitude;
        drivers[msg.sender].longitude = longitude;
    }
    
    // ========== Rider Functions ==========
    function requestRide(string memory origin, string memory destination, uint256 fare) public returns (uint256) {
        uint256 currentRideId = rideCount;
        
        Ride storage ride = rides[currentRideId];
        ride.rider = msg.sender;
        ride.origin = origin;
        ride.destination = destination;
        ride.fare = fare;
        ride.status = RideStatus.Requested;
        ride.timestamp = block.timestamp;
        
        riderRides[msg.sender].push(currentRideId);
        
        emit RideRequested(currentRideId, msg.sender, origin, destination, fare);
        
        rideCount++;
        return currentRideId;
    }
    
    // ========== Shared Functions ==========
    function acceptRide(uint256 rideId) public {
        require(drivers[msg.sender].isRegistered, "Driver not registered");
        require(drivers[msg.sender].isAvailable, "Driver not available");
        
        Ride storage ride = rides[rideId];
        require(ride.status == RideStatus.Requested, "Ride not available");
        
        ride.driver = msg.sender;
        ride.status = RideStatus.Accepted;
        
        driverRides[msg.sender].push(rideId);
        
        emit RideAccepted(rideId, msg.sender);
    }
    
    function startRide(uint256 rideId) public {
        Ride storage ride = rides[rideId];
        require(msg.sender == ride.driver, "Only driver can start");
        require(ride.status == RideStatus.Accepted, "Ride not accepted");
        
        ride.status = RideStatus.Started;
        
        emit RideStarted(rideId);
    }
    
    function completeRide(uint256 rideId) public {
        Ride storage ride = rides[rideId];
        require(msg.sender == ride.driver, "Only driver can complete");
        require(ride.status == RideStatus.Started, "Ride not started");
        
        ride.status = RideStatus.Completed;
        
        // Calculate platform fee
        uint256 platformFee = (ride.fare * platformFeePercent) / 10000;
        uint256 driverPayment = ride.fare - platformFee;
        
        // Update driver earnings
        drivers[ride.driver].totalEarnings += driverPayment;
        drivers[ride.driver].rideCount++;
        
        emit RideCompleted(rideId);
        emit PaymentProcessed(rideId, ride.driver, driverPayment);
    }
    
    function declineRide(uint256 rideId) public {
        Ride storage ride = rides[rideId];
        require(ride.status == RideStatus.Requested, "Ride not available for declining");
        
        ride.status = RideStatus.Declined;
        ride.driver = msg.sender; // Record who declined it
        
        emit RideDeclined(rideId, msg.sender);
    }
    
    function rateDriver(uint256 rideId, uint256 rating) public {
        Ride storage ride = rides[rideId];
        require(msg.sender == ride.rider, "Only rider can rate");
        require(ride.status == RideStatus.Completed, "Ride not completed");
        require(rating >= 1 && rating <= 5, "Rating must be between 1-5");
        
        // Simple average rating calculation
        Driver storage driver = drivers[ride.driver];
        
        if (driver.rideCount == 0) {
            driver.rating = rating;
        } else {
            // Calculate new average rating
            driver.rating = ((driver.rating * driver.rideCount) + rating) / (driver.rideCount + 1);
        }
    }
    
    // ========== View Functions ==========
    function getRideDetails(uint256 rideId) public view returns (
        address rider,
        address driver,
        string memory origin,
        string memory destination,
        uint256 fare,
        RideStatus status,
        uint256 timestamp
    ) {
        Ride memory ride = rides[rideId];
        return (
            ride.rider,
            ride.driver,
            ride.origin,
            ride.destination,
            ride.fare,
            ride.status,
            ride.timestamp
        );
    }
    
    function getActiveRideRequests() public view returns (
        uint256[] memory rideIds,
        address[] memory riders,
        string[] memory pickups,
        string[] memory destinations,
        uint256[] memory fares
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
        
        // Fill arrays with pending ride data
        uint256 index = 0;
        for (uint256 i = 0; i < rideCount; i++) {
            if (rides[i].status == RideStatus.Requested) {
                Ride memory ride = rides[i];
                rideIds[index] = i;
                riders[index] = ride.rider;
                pickups[index] = ride.origin;
                destinations[index] = ride.destination;
                fares[index] = ride.fare;
                index++;
            }
        }
    }
    
    function getUserRides(address user) public view returns (uint256[] memory) {
        if (riderRides[user].length > 0) {
            return riderRides[user];
        } else {
            return driverRides[user];
        }
    }
    
    function getAvailableDrivers() public view returns (
        address[] memory driverAddresses,
        string[] memory names,
        string[] memory vehicleInfos,
        uint256[] memory ratings
    ) {
        // Count available drivers
        uint256 availableCount = 0;
        for (uint256 i = 0; i < driverList.length; i++) {
            if (drivers[driverList[i]].isAvailable) {
                availableCount++;
            }
        }
        
        // Initialize arrays
        driverAddresses = new address[](availableCount);
        names = new string[](availableCount);
        vehicleInfos = new string[](availableCount);
        ratings = new uint256[](availableCount);
        
        // Fill arrays with available driver data
        uint256 index = 0;
        for (uint256 i = 0; i < driverList.length; i++) {
            if (drivers[driverList[i]].isAvailable) {
                address driverAddr = driverList[i];
                Driver memory driver = drivers[driverAddr];
                
                driverAddresses[index] = driverAddr;
                names[index] = driver.name;
                vehicleInfos[index] = driver.vehicleInfo;
                ratings[index] = driver.rating;
                index++;
            }
        }
    }
    
    // ========== Admin Functions ==========
    function setPlatformFee(uint256 _feePercent) public {
        require(msg.sender == platformWallet, "Only platform owner can set fee");
        require(_feePercent <= 3000, "Fee cannot exceed 30%");
        platformFeePercent = _feePercent;
    }
    
    function setPlatformWallet(address _wallet) public {
        require(msg.sender == platformWallet, "Only platform owner can change wallet");
        require(_wallet != address(0), "Invalid address");
        platformWallet = _wallet;
    }
    
    // Allow the platform to receive ETH payments
    receive() external payable {}
} 