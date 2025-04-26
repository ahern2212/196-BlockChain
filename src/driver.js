// Global variables
let web3;
let rideSharingContract;
let driverMap;
let driverMarker;
let currentRideId;
let locationTrackingId;
let isDriverRegistered = false;

// Initialize the application
async function init() {
    console.log("Initializing driver application...");
    
    // Initialize Web3
    if (window.ethereum) {
        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
            
            // Update connection status
            document.getElementById("connection-status").textContent = "Connected";
            document.getElementById("connection-status").className = "connected";
            
            // Add account selector - use the new shared component
            if (window.addAccountSelector) {
                await window.addAccountSelector('Driver Account:', '.account-container', true);
            }
            
            // Initialize contract
            initContract();
            
            // Check if driver is registered
            await checkDriverRegistration();
            
            // Check for active rides
            await checkActiveRides();
            
            // Initialize map
            initMap();
            
            // Set up event listeners
            setupEventListeners();
            
            // Listen for account changes
            window.ethereum.on('accountsChanged', async (accounts) => {
                console.log('Account changed to:', accounts[0]);
                await checkDriverRegistration(); // Re-check registration with new account
                document.getElementById("status-message").textContent = "Account changed. Please check your status.";
            });
        } catch (error) {
            console.error("User denied account access", error);
            document.getElementById("status-message").textContent = "Please connect your wallet to continue.";
        }
    } else if (window.web3) {
        web3 = new Web3(window.web3.currentProvider);
        document.getElementById("connection-status").textContent = "Connected (Legacy)";
        document.getElementById("connection-status").className = "connected";
        
        // Initialize contract
        initContract();
        
        // Check if driver is registered
        checkDriverRegistration();
        
        // Initialize map
        initMap();
        
        // Set up event listeners
        setupEventListeners();
    } else {
        console.error("No web3 detected. Please install MetaMask!");
        document.getElementById("status-message").textContent = "No Web3 detected. Please install MetaMask!";
    }
}

// Initialize the smart contract
function initContract() {
    // Replace with your contract ABI and address
    const contractABI = [
        {
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "driverAddress",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "bool",
                    "name": "isAvailable",
                    "type": "bool"
                }
            ],
            "name": "DriverAvailabilityUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "driverAddress",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                }
            ],
            "name": "DriverRegistered",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "driver",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "PaymentProcessed",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "driver",
                    "type": "address"
                }
            ],
            "name": "RideAccepted",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                }
            ],
            "name": "RideCompleted",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "driver",
                    "type": "address"
                }
            ],
            "name": "RideDeclined",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "rider",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "origin",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "destination",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "fare",
                    "type": "uint256"
                }
            ],
            "name": "RideRequested",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                }
            ],
            "name": "RideStarted",
            "type": "event"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                }
            ],
            "name": "acceptRide",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                }
            ],
            "name": "completeRide",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                }
            ],
            "name": "declineRide",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "driverList",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "driverRides",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "drivers",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "vehicleInfo",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "licenseNumber",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "totalEarnings",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "isRegistered",
                    "type": "bool"
                },
                {
                    "internalType": "bool",
                    "name": "isAvailable",
                    "type": "bool"
                },
                {
                    "internalType": "int256",
                    "name": "latitude",
                    "type": "int256"
                },
                {
                    "internalType": "int256",
                    "name": "longitude",
                    "type": "int256"
                },
                {
                    "internalType": "uint256",
                    "name": "rating",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "rideCount",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getActiveRideRequests",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "rideIds",
                    "type": "uint256[]"
                },
                {
                    "internalType": "address[]",
                    "name": "riders",
                    "type": "address[]"
                },
                {
                    "internalType": "string[]",
                    "name": "pickups",
                    "type": "string[]"
                },
                {
                    "internalType": "string[]",
                    "name": "destinations",
                    "type": "string[]"
                },
                {
                    "internalType": "uint256[]",
                    "name": "fares",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getAvailableDrivers",
            "outputs": [
                {
                    "internalType": "address[]",
                    "name": "driverAddresses",
                    "type": "address[]"
                },
                {
                    "internalType": "string[]",
                    "name": "names",
                    "type": "string[]"
                },
                {
                    "internalType": "string[]",
                    "name": "vehicleInfos",
                    "type": "string[]"
                },
                {
                    "internalType": "uint256[]",
                    "name": "ratings",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_driverAddress",
                    "type": "address"
                }
            ],
            "name": "getDriverDetails",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "vehicleInfo",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "totalEarnings",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                }
            ],
            "name": "getRideDetails",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "rider",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "driver",
                    "type": "address"
                },
                {
                    "internalType": "string",
                    "name": "origin",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "destination",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "fare",
                    "type": "uint256"
                },
                {
                    "internalType": "enum RideSharingPlatform.RideStatus",
                    "name": "status",
                    "type": "uint8"
                },
                {
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "getUserRides",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_driverAddress",
                    "type": "address"
                }
            ],
            "name": "isDriverRegistered",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "platformFeePercent",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "platformWallet",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "rating",
                    "type": "uint256"
                }
            ],
            "name": "rateDriver",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_name",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_vehicleInfo",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_licenseNumber",
                    "type": "string"
                }
            ],
            "name": "registerDriver",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "origin",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "destination",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "fare",
                    "type": "uint256"
                }
            ],
            "name": "requestRide",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "rideCount",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "riderRides",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "rides",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "rider",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "driver",
                    "type": "address"
                },
                {
                    "internalType": "string",
                    "name": "origin",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "destination",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "fare",
                    "type": "uint256"
                },
                {
                    "internalType": "enum RideSharingPlatform.RideStatus",
                    "name": "status",
                    "type": "uint8"
                },
                {
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bool",
                    "name": "_isAvailable",
                    "type": "bool"
                }
            ],
            "name": "setDriverAvailability",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_feePercent",
                    "type": "uint256"
                }
            ],
            "name": "setPlatformFee",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_wallet",
                    "type": "address"
                }
            ],
            "name": "setPlatformWallet",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "rideId",
                    "type": "uint256"
                }
            ],
            "name": "startRide",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "int256",
                    "name": "latitude",
                    "type": "int256"
                },
                {
                    "internalType": "int256",
                    "name": "longitude",
                    "type": "int256"
                }
            ],
            "name": "updateDriverLocation",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "stateMutability": "payable",
            "type": "receive"
        }
    ];
    const contractAddress = '0x3a63499187455805AD9C153F9dEEdc9b6189bf0E';
    
    rideSharingContract = new web3.eth.Contract(contractABI, contractAddress);
    console.log("Contract initialized");

    // Debug: Print contract methods
    console.log("Available contract methods:", rideSharingContract.methods);
}

// Check if the current account is registered as a driver
async function checkDriverRegistration() {
    try {
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        
        // Call the contract to check if driver is registered
        isDriverRegistered = await rideSharingContract.methods.isDriverRegistered(account).call();
        
        if (isDriverRegistered) {
            // Get driver details
            const driverDetails = await rideSharingContract.methods.getDriverDetails(account).call();
            
            // Update UI with driver details
            document.getElementById("driver-name").textContent = driverDetails.name;
            document.getElementById("driver-vehicle").textContent = driverDetails.vehicleInfo;
            document.getElementById("total-rides").textContent = driverDetails.totalEarnings.toString();
            
            // Hide register button
            document.getElementById("register-button").style.display = "none";
            
            // Enable availability toggle and set its state
            document.getElementById("availability-toggle").disabled = false;
            document.getElementById("availability-toggle").checked = true;
            
            document.getElementById("status-message").textContent = "Ready to accept rides.";
        } else {
            // Show registration button
            document.getElementById("register-button").style.display = "block";
            
            // Disable availability toggle
            document.getElementById("availability-toggle").disabled = true;
            
            document.getElementById("status-message").textContent = "Please register as a driver to continue.";
        }
    } catch (error) {
        console.error("Error checking driver registration:", error);
        document.getElementById("status-message").textContent = "Error checking driver status.";
    }
}

// Initialize the map
function initMap() {
    // Create map centered on a default location
    driverMap = L.map('driver-map').setView([37.7749, -122.4194], 13);
    
    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(driverMap);
    
    // Try to get driver's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                driverMap.setView([pos.lat, pos.lng], 15);
                
                // Create a marker for the driver's location
                driverMarker = L.marker([pos.lat, pos.lng]).addTo(driverMap)
                    .bindPopup('Your Location')
                    .openPopup();
            },
            () => {
                console.log("Error: The Geolocation service failed.");
            }
        );
    }
}

// Set up event listeners
function setupEventListeners() {
    // Register button click
    document.getElementById("register-button").addEventListener("click", function() {
        document.getElementById("registration-modal").style.display = "block";
    });
    
    // Close modal button
    document.querySelector(".close-button").addEventListener("click", function() {
        document.getElementById("registration-modal").style.display = "none";
    });
    
    // Registration form submission
    document.getElementById("registration-form").addEventListener("submit", async function(event) {
        event.preventDefault();
        await registerAsDriver();
    });
    
    // Availability toggle
    document.getElementById("availability-toggle").addEventListener("change", async function() {
        await toggleDriverAvailability();
    });
    
    // Ride action buttons
    document.getElementById("arrived-button").addEventListener("click", arrivedAtPickup);
    document.getElementById("start-ride-button").addEventListener("click", startRide);
    document.getElementById("complete-ride-button").addEventListener("click", completeRide);
    
    // Add switch to rider button event listener
    const switchButton = document.getElementById("switch-to-rider");
    if (switchButton) {
        switchButton.addEventListener("click", function() {
            console.log("Switch to rider button clicked");
            window.location.href = "index.html"; // or the correct path to your rider page
        });
    } else {
        console.error("Switch to rider button not found in the DOM");
    }
}

// Register as a driver
async function registerAsDriver() {
    try {
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        
        const driverName = document.getElementById("driver-name-input").value;
        const vehicleInfo = document.getElementById("vehicle-info").value;
        const licenseNumber = document.getElementById("license-number").value;
        
        if (!driverName || !vehicleInfo || !licenseNumber) {
            alert("Please fill in all fields");
            return;
        }
        
        document.getElementById("status-message").textContent = "Registering as driver...";
        
        // Call smart contract to register driver
        await rideSharingContract.methods.registerDriver(
            driverName, 
            vehicleInfo, 
            licenseNumber
        ).send({ from: account });
        
        document.getElementById("status-message").textContent = "Successfully registered as a driver!";
        
        // Hide registration modal
        document.getElementById("registration-modal").style.display = "none";
        
        // Update driver status
        isDriverRegistered = true;
        
        // Update UI
        document.getElementById("driver-name").textContent = driverName;
        document.getElementById("driver-vehicle").textContent = vehicleInfo;
        document.getElementById("register-button").style.display = "none";
        document.getElementById("availability-toggle").disabled = false;
    } catch (error) {
        console.error("Error registering as driver:", error);
        document.getElementById("status-message").textContent = "Error registering as driver.";
    }
}

// Toggle driver availability
async function toggleDriverAvailability() {
    if (!isDriverRegistered) {
        alert("Please register as a driver first");
        document.getElementById("availability-toggle").checked = false;
        return;
    }
    
    try {
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        const isAvailable = document.getElementById("availability-toggle").checked;
        
        // Update availability in the contract
        await rideSharingContract.methods.setDriverAvailability(isAvailable)
            .send({ from: account });
        
        if (isAvailable) {
            document.getElementById("status-message").textContent = "You are now online and can receive ride requests.";
            document.getElementById("availability-status").textContent = "ONLINE";
            document.getElementById("availability-status").className = "status-online";
            
            // Start location tracking
            startLocationTracking();
            
            // Start listening for ride requests
            startListeningForRideRequests();
        } else {
            document.getElementById("status-message").textContent = "You are now offline.";
            document.getElementById("availability-status").textContent = "OFFLINE";
            document.getElementById("availability-status").className = "status-offline";
            
            // Stop location tracking
            stopLocationTracking();
        }
    } catch (error) {
        console.error("Error toggling availability:", error);
        document.getElementById("status-message").textContent = "Error updating availability.";
        document.getElementById("availability-toggle").checked = !document.getElementById("availability-toggle").checked;
    }
}

// Start tracking driver location
function startLocationTracking() {
    if (navigator.geolocation) {
        locationTrackingId = navigator.geolocation.watchPosition(
            async (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                
                // Update driver marker on map
                if (driverMarker) {
                    driverMarker.setLatLng([pos.lat, pos.lng]);
                }
                
                // Update driver location in contract
                try {
                    const accounts = await web3.eth.getAccounts();
                    // Convert coordinates to integers (multiply by 1e6 to preserve 6 decimal places)
                    const latInt = Math.round(pos.lat * 1000000);
                    const lngInt = Math.round(pos.lng * 1000000);
                    
                    console.log("Updating location with values:", {
                        originalLat: pos.lat,
                        originalLng: pos.lng,
                        convertedLat: latInt,
                        convertedLng: lngInt
                    });
                    
                    await rideSharingContract.methods.updateDriverLocation(
                        web3.utils.toBN(latInt),
                        web3.utils.toBN(lngInt)
                    ).send({ from: accounts[0] });
                } catch (error) {
                    console.error("Error updating location:", error);
                }
            },
            (error) => {
                console.log("Error: The Geolocation service failed.", error);
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        );
    }
}

// Stop tracking driver location
function stopLocationTracking() {
    if (locationTrackingId) {
        navigator.geolocation.clearWatch(locationTrackingId);
    }
}

// Function to navigate to rider's pickup location
function navigateToPickup() {
    if (!currentRideId) {
        showToast('No active ride to navigate to', 'error');
        return;
    }
    
    const pickupLocation = document.getElementById("pickup-location").textContent;
    
    // Check if we have a valid pickup location
    if (!pickupLocation) {
        showToast('Pickup location not available', 'error');
        return;
    }
    
    // First try to parse coordinates if available
    let lat, lng;
    const coordsMatch = pickupLocation.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    
    if (coordsMatch) {
        lat = parseFloat(coordsMatch[1]);
        lng = parseFloat(coordsMatch[2]);
        
        if (!isNaN(lat) && !isNaN(lng)) {
            // We have coordinates, calculate route
            showToast('Calculating route to pickup location...', 'info');
            
            // Get driver's current position
            if (driverMarker) {
                const driverPos = driverMarker.getLatLng();
                
                // Create routing control for directions
                if (window.routingControl) {
                    map.removeControl(window.routingControl);
                }
                
                window.routingControl = L.Routing.control({
                    waypoints: [
                        L.latLng(driverPos.lat, driverPos.lng),
                        L.latLng(lat, lng)
                    ],
                    routeWhileDragging: false,
                    lineOptions: {
                        styles: [{ color: '#6FA1EC', weight: 4 }]
                    },
                    show: true,
                    showAlternatives: true,
                    addWaypoints: false
                }).addTo(driverMap);
                
                // Fit map to show the route
                driverMap.fitBounds([
                    [driverPos.lat, driverPos.lng],
                    [lat, lng]
                ], { padding: [50, 50] });
                
                // If supported, open in maps app
                const openInMapsBtn = document.createElement('button');
                openInMapsBtn.textContent = 'Open in Maps App';
                openInMapsBtn.className = 'map-button';
                openInMapsBtn.onclick = function() {
                    // Try to open in maps app
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                    let mapsUrl;
                    
                    if (isMobile) {
                        // Mobile devices
                        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                            // iOS
                            mapsUrl = `maps://?daddr=${lat},${lng}`;
                        } else {
                            // Android
                            mapsUrl = `geo:0,0?q=${lat},${lng}(Pickup Location)`;
                        }
                    } else {
                        // Desktop - open Google Maps
                        mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                    }
                    
                    window.open(mapsUrl, '_blank');
                };
                
                // Add button to the map
                const mapButtonContainer = document.createElement('div');
                mapButtonContainer.style.position = 'absolute';
                mapButtonContainer.style.bottom = '10px';
                mapButtonContainer.style.left = '10px';
                mapButtonContainer.style.zIndex = '1000';
                mapButtonContainer.appendChild(openInMapsBtn);
                
                // Remove any existing button first
                const existingBtn = document.querySelector('.map-button-container');
                if (existingBtn) {
                    existingBtn.remove();
                }
                
                mapButtonContainer.className = 'map-button-container';
                document.querySelector('#driver-map').appendChild(mapButtonContainer);
                
                return true;
            } else {
                showToast('Driver location not available', 'error');
                return false;
            }
        }
    }
    
    // If no coordinates, try to geocode the address
    showToast('Geocoding pickup address...', 'info');
    
    // Use OpenStreetMap Nominatim API for geocoding
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pickupLocation)}&limit=1`;
    
    fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const location = data[0];
                navigateToCoordinates(parseFloat(location.lat), parseFloat(location.lon));
            } else {
                showToast('Could not find location coordinates', 'error');
            }
        })
        .catch(error => {
            console.error('Error geocoding address:', error);
            showToast('Error finding location', 'error');
        });
}

// Helper function to navigate to coordinates
function navigateToCoordinates(lat, lng) {
    if (!driverMarker) {
        showToast('Driver location not available', 'error');
        return;
    }
    
    const driverPos = driverMarker.getLatLng();
    
    // Create routing control for directions
    if (window.routingControl) {
        driverMap.removeControl(window.routingControl);
    }
    
    window.routingControl = L.Routing.control({
        waypoints: [
            L.latLng(driverPos.lat, driverPos.lng),
            L.latLng(lat, lng)
        ],
        routeWhileDragging: false,
        lineOptions: {
            styles: [{ color: '#6FA1EC', weight: 4 }]
        },
        show: true,
        showAlternatives: true,
        addWaypoints: false
    }).addTo(driverMap);
    
    // Fit map to show the route
    driverMap.fitBounds([
        [driverPos.lat, driverPos.lng],
        [lat, lng]
    ], { padding: [50, 50] });
    
    showToast('Route calculated successfully', 'success');
}

// Function to display a toast message
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 
                       type === 'info' ? 'fa-info-circle' : 
                       'fa-check-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Function to update ride status and progress bar
function updateRideStatus(status, progressPercent) {
    const statusText = document.getElementById("ride-status-text");
    const progressBar = document.getElementById("ride-progress");
    
    if (statusText) {
        statusText.textContent = status;
    }
    
    if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
    }
}

// Update acceptRide function to initialize ride status
async function acceptRide(rideId) {
    try {
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        
        console.log(`Accepting ride ${rideId} from account ${account}`);
        document.getElementById("status-message").textContent = "Accepting ride...";
        
        // Call the contract to accept the ride
        await rideSharingContract.methods.acceptRide(rideId)
            .send({ from: account, gas: 200000 });
        
        console.log(`Ride ${rideId} accepted successfully`);
        document.getElementById("status-message").textContent = "Ride accepted! Proceed to pickup location.";
        
        // Update UI to show active ride
        const requestElement = document.getElementById(`request-${rideId}`);
        if (requestElement) {
            const pickupLocation = requestElement.querySelector('.request-details p:nth-child(2)').textContent.replace('From: ', '');
            const destinationLocation = requestElement.querySelector('.request-details p:nth-child(3)').textContent.replace('To: ', '');
            const riderAddress = requestElement.querySelector('.request-details p:nth-child(4)').textContent.replace('Rider: ', '');
            const rideFare = requestElement.querySelector('.request-details p:nth-child(5)').textContent.replace('Fare: ', '');
            
            // Update active ride panel
            document.getElementById("pickup-location").textContent = pickupLocation;
            document.getElementById("destination-location").textContent = destinationLocation;
            document.getElementById("rider-address").textContent = riderAddress;
            document.getElementById("ride-fare").textContent = rideFare;
            
            // Initialize ride status
            updateRideStatus("Heading to pickup", 10);
            
            // Add navigation button
            const actionButtons = document.querySelector('#active-ride .ride-actions');
            if (actionButtons) {
                // Check if button already exists
                if (!document.getElementById('navigate-button')) {
                    const navigateButton = document.createElement('button');
                    navigateButton.id = 'navigate-button';
                    navigateButton.className = 'action-button';
                    navigateButton.innerHTML = '<i class="fas fa-directions"></i> Navigate';
                    navigateButton.onclick = navigateToPickup;
                    
                    // Insert before the first button
                    actionButtons.insertBefore(navigateButton, actionButtons.firstChild);
                }
            }
            
            // Show active ride panel
            document.getElementById("active-ride").style.display = "block";
            
            // Clear all other ride requests
            const requestsContainer = document.getElementById("requests-container");
            requestsContainer.innerHTML = '<p>You have an active ride. Complete it before accepting new requests.</p>';
            
            // Store current ride ID
            currentRideId = rideId;
            
            // Try to get pickup coordinates and set map marker
            try {
                // Try to parse coordinates from the pickup location
                const pickupText = pickupLocation.split(',');
                if (pickupText.length >= 2) {
                    const pickupLat = parseFloat(pickupText[0]);
                    const pickupLng = parseFloat(pickupText[1]);
                    
                    if (!isNaN(pickupLat) && !isNaN(pickupLng)) {
                        // Create pickup marker on map
                        const pickupMarker = L.marker([pickupLat, pickupLng])
                            .addTo(driverMap)
                            .bindPopup('Pickup Location')
                            .openPopup();
                        
                        // Center map on pickup location
                        driverMap.setView([pickupLat, pickupLng], 15);
                        
                        // Automatically calculate route to pickup
                        navigateToCoordinates(pickupLat, pickupLng);
                    }
                }
            } catch (error) {
                console.error("Error setting up map for pickup:", error);
            }
        }
    } catch (error) {
        console.error(`Error accepting ride ${rideId}:`, error);
        document.getElementById("status-message").textContent = "Error accepting ride.";
    }
}

// Decline a ride request
async function declineRide(rideId) {
    try {
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        
        console.log(`Declining ride ${rideId} from account ${account}`);
        
        // Call the contract to decline the ride
        await rideSharingContract.methods.declineRide(rideId)
            .send({ from: account, gas: 100000 });
        
        console.log(`Ride ${rideId} declined successfully`);
        
        // Remove this ride request from the UI
        const requestElement = document.getElementById(`request-${rideId}`);
        if (requestElement) {
            requestElement.remove();
        }
        
        // Check if we need to display "no requests" message
        const requestsContainer = document.getElementById("requests-container");
        if (requestsContainer.children.length === 0) {
            requestsContainer.innerHTML = '<div class="no-requests"><p>No active ride requests at the moment</p></div>';
        }
    } catch (error) {
        console.error(`Error declining ride ${rideId}:`, error);
        document.getElementById("status-message").textContent = "Error declining ride.";
    }
}

// Improve the checkActiveRides function to poll more reliably
async function checkActiveRides() {
    try {
        // If driver has an active ride, don't show other requests
        if (currentRideId) {
            console.log("Driver has an active ride, not checking for new requests");
            return;
        }
        
        // Make sure driver is available
        if (!document.getElementById("availability-toggle").checked) {
            console.log("Driver is unavailable, not checking for ride requests");
            return;
        }
        
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        
        console.log("Checking for active rides...");
        
        try {
            // Get active ride requests from contract
            const result = await rideSharingContract.methods.getActiveRideRequests().call();
            console.log("Active rides response:", result);
            
            // For the new unified contract, the result is returned directly as named arrays
            // No need for complex extraction - this handles both old and new contract formats
            const rideIds = Array.isArray(result.rideIds) ? result.rideIds : 
                           (Array.isArray(result[0]) ? result[0] : []);
            const riders = Array.isArray(result.riders) ? result.riders : 
                          (Array.isArray(result[1]) ? result[1] : []);
            const pickups = Array.isArray(result.pickups) ? result.pickups : 
                           (Array.isArray(result[2]) ? result[2] : []);
            const destinations = Array.isArray(result.destinations) ? result.destinations : 
                                (Array.isArray(result[3]) ? result[3] : []);
            const fares = Array.isArray(result.fares) ? result.fares : 
                         (Array.isArray(result[4]) ? result[4] : []);
            
            console.log("Extracted ride data:", {
                rideCount: rideIds.length,
                rideIds, riders, pickups, destinations, fares
            });
            
            if (rideIds && rideIds.length > 0) {
                console.log("Number of active rides:", rideIds.length);
                
                // Remove any request elements that are no longer active
                const requestsContainer = document.getElementById("requests-container");
                const existingRequests = requestsContainer.querySelectorAll('.ride-request');
                const activeRideIds = new Set(rideIds.map(id => id.toString()));
                
                existingRequests.forEach(req => {
                    const reqId = req.id.replace('request-', '');
                    if (!activeRideIds.has(reqId)) {
                        console.log(`Removing ride request ${reqId} as it's no longer active`);
                        req.remove();
                    }
                });
                
                // Loop through all rides
                for (let i = 0; i < rideIds.length; i++) {
                    const rideIdString = rideIds[i].toString();
                    console.log(`Processing ride ${i}:`, {
                        rideId: rideIdString,
                        rider: riders[i],
                        pickup: pickups[i],
                        destination: destinations[i],
                        fare: fares[i]
                    });
                    
                    // Check if this ride request is already displayed
                    const existingRequest = document.getElementById(`request-${rideIdString}`);
                    if (!existingRequest) {
                        showRideRequest(rideIdString, riders[i], pickups[i], destinations[i], fares[i]);
                    }
                }
                
                // Play a notification sound if new rides were added
                if (document.querySelectorAll('.ride-request').length > existingRequests.length) {
                    try {
                        const audio = new Audio('notification.mp3');
                        audio.play().catch(e => console.log("Audio play failed:", e));
                    } catch (e) {
                        console.log("Could not play notification sound:", e);
                    }
                }
            } else {
                console.log("No active rides found");
                
                // Show the "no requests" message if there are no active rides
                const requestsContainer = document.getElementById("requests-container");
                if (requestsContainer.querySelectorAll('.ride-request').length === 0) {
                    requestsContainer.innerHTML = '<div class="no-requests"><p>No active ride requests at the moment</p></div>';
                }
            }
        } catch (error) {
            console.error("Error checking active rides:", error);
            console.error("Error details:", {
                message: error.message,
                code: error.code,
                data: error.data
            });
        }
    } catch (outer_error) {
        console.error("Outer error in checkActiveRides:", outer_error);
    }
}

// Improve the ride request event handling
function startListeningForRideRequests() {
    // Check active rides immediately
    checkActiveRides();
    
    // Then check active rides every 15 seconds (more frequent than before)
    setInterval(checkActiveRides, 15000);
    
    // Try to listen for RideRequested events if supported
    if (rideSharingContract.events && rideSharingContract.events.RideRequested) {
        rideSharingContract.events.RideRequested({
            fromBlock: 'latest'
        })
        .on('data', function(event) {
            console.log("New ride request event detected:", event);
            
            // Driver must be available to see new requests
            if (document.getElementById("availability-toggle").checked && !currentRideId) {
                // Show a notification that a new ride is available
                document.getElementById("status-message").textContent = "New ride request available!";
                
                // Rather than handling the event directly, trigger a check for active rides
                // This ensures we get all ride details including fare
                checkActiveRides();
            }
        })
        .on('error', function(error) {
            console.error("Error listening for ride requests:", error);
        });
    } else {
        console.log("RideRequested event not supported by contract, falling back to polling");
    }
    
    // No longer listen for RideAccepted events since they don't exist in the current contract
    // We'll rely on polling to detect when rides are no longer available
}

// Function to display a ride request in the UI
function showRideRequest(rideId, rider, pickup, destination, fare) {
    console.log(`Showing ride request ${rideId} from ${rider}`);
    
    const requestsContainer = document.getElementById("requests-container");
    
    // Remove the "no requests" message if it exists
    const noRequestsElement = requestsContainer.querySelector('.no-requests');
    if (noRequestsElement) {
        requestsContainer.innerHTML = '';
    }
    
    // Create the ride request element
    const requestElement = document.createElement('div');
    requestElement.id = `request-${rideId}`;
    requestElement.className = 'ride-request';
    
    // Format rider address for display (truncate for brevity)
    const shortRider = rider.substring(0, 6) + '...' + rider.substring(rider.length - 4);
    
    // Format the fare in ETH
    const fareInEth = web3.utils.fromWei(fare.toString(), 'ether');
    
    // Calculate the approximate distance and time (would be more accurate with real geocoding)
    let distanceEstimate = "Unknown";
    let timeEstimate = "Unknown";
    
    try {
        // This is a simple placeholder - in a real app you would use geocoding APIs
        // to calculate actual distances and ETAs
        distanceEstimate = "~5 miles";
        timeEstimate = "~15 min";
    } catch (error) {
        console.error("Error calculating distance/time estimates:", error);
    }
    
    // Build the HTML content
    requestElement.innerHTML = `
        <div class="request-header">
            <h3>Ride Request #${rideId}</h3>
            <span class="fare">${fareInEth} ETH</span>
        </div>
        <div class="request-details">
            <p><strong>Estimates:</strong> ${distanceEstimate} · ${timeEstimate}</p>
            <p><strong>From:</strong> ${pickup}</p>
            <p><strong>To:</strong> ${destination}</p>
            <p><strong>Rider:</strong> ${shortRider}</p>
            <p><strong>Fare:</strong> ${fareInEth} ETH</p>
        </div>
        <div class="request-actions">
            <button class="accept-button" onclick="acceptRide('${rideId}')">
                <i class="fas fa-check"></i> Accept
            </button>
            <button class="decline-button" onclick="declineRide('${rideId}')">
                <i class="fas fa-times"></i> Decline
            </button>
        </div>
    `;
    
    // Add the request to the container
    requestsContainer.appendChild(requestElement);
    
    // Try to show the pickup on the map
    try {
        // For actual coordinates, you would parse them from the pickup string
        // or fetch them via geocoding API
        const pickupParts = pickup.split(',');
        if (pickupParts.length >= 2) {
            const lat = parseFloat(pickupParts[0]);
            const lng = parseFloat(pickupParts[1]);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                // Create a pickup marker
                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'pickup-marker',
                        html: '<i class="fas fa-map-marker-alt"></i>',
                        iconSize: [30, 30],
                        iconAnchor: [15, 30]
                    })
                }).addTo(driverMap);
                
                marker.bindPopup(`<b>Pickup:</b> ${pickup}`).openPopup();
                
                // Store the marker reference for later cleanup
                rideMarkers[rideId] = marker;
            }
        }
    } catch (error) {
        console.error("Error showing pickup on map:", error);
    }
    
    // Play notification sound
    try {
        const audio = new Audio('notification.mp3');
        audio.play().catch(e => console.log("Audio play failed:", e));
    } catch (e) {
        console.log("Could not play notification sound:", e);
    }
}

// Update arrivedAtPickup function to update status
async function arrivedAtPickup() {
    if (!currentRideId) {
        showToast('No active ride', 'error');
        return;
    }
    
    try {
        // Update UI to show driver has arrived
        document.getElementById("status-message").textContent = "You have arrived at the pickup location";
        
        // Enable the Start Ride button
        document.getElementById("start-ride-button").disabled = false;
        
        // Highlight the button to indicate next action
        document.getElementById("start-ride-button").classList.add("highlight");
        
        // Notify rider that driver has arrived (in a real app, this would be a push notification)
        showToast('Rider has been notified of your arrival', 'success');
        
        // Play notification sound if available
        try {
            const audio = new Audio('notification.mp3');
            audio.play().catch(e => console.log("Audio play failed:", e));
        } catch (e) {
            console.log("Could not play notification sound:", e);
        }
        
        // Update ride status
        updateRideStatus("At pickup location", 33);
    } catch (error) {
        console.error("Error in arrivedAtPickup:", error);
        showToast('Error processing arrival', 'error');
    }
}

// Update startRide function to update status
async function startRide() {
    if (!currentRideId) {
        showToast('No active ride', 'error');
        return;
    }
    
    try {
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        
        // Update UI
        document.getElementById("status-message").textContent = "Starting ride...";
        
        // Call the contract to start the ride
        await rideSharingContract.methods.startRide(currentRideId)
            .send({ from: account, gas: 200000 });
        
        // Update UI after confirmation
        document.getElementById("status-message").textContent = "Ride in progress";
        
        // Disable the Start Ride button
        document.getElementById("start-ride-button").disabled = true;
        document.getElementById("start-ride-button").classList.remove("highlight");
        
        // Enable the Complete Ride button
        document.getElementById("complete-ride-button").disabled = false;
        document.getElementById("complete-ride-button").classList.add("highlight");
        
        // Calculate and show the route from pickup to destination
        calculateRouteToDestination();
        
        showToast('Ride started successfully', 'success');
        
        // Update ride status
        updateRideStatus("Ride in progress", 66);
    } catch (error) {
        console.error("Error starting ride:", error);
        showToast('Error starting ride: ' + error.message, 'error');
    }
}

// Calculate route from pickup to destination
function calculateRouteToDestination() {
    try {
        const pickupLocation = document.getElementById("pickup-location").textContent;
        const destinationLocation = document.getElementById("destination-location").textContent;
        
        if (!pickupLocation || !destinationLocation) {
            showToast('Missing location information', 'error');
            return;
        }
        
        // First try to handle if we have coordinate formats
        const pickupCoords = extractCoordinates(pickupLocation);
        const destinationCoords = extractCoordinates(destinationLocation);
        
        if (pickupCoords && destinationCoords) {
            // We have coordinates for both locations
            showRouteOnMap(pickupCoords.lat, pickupCoords.lng, destinationCoords.lat, destinationCoords.lng);
            return;
        }
        
        // If we don't have coordinates, try geocoding
        showToast('Calculating route to destination...', 'info');
        
        // Geocode the destination
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationLocation)}&limit=1`;
        
        fetch(geocodeUrl)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const location = data[0];
                    const destLat = parseFloat(location.lat);
                    const destLng = parseFloat(location.lon);
                    
                    // If we need to geocode the pickup as well
                    if (!pickupCoords) {
                        const pickupGeoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pickupLocation)}&limit=1`;
                        
                        fetch(pickupGeoUrl)
                            .then(response => response.json())
                            .then(pickupData => {
                                if (pickupData && pickupData.length > 0) {
                                    const pickupLoc = pickupData[0];
                                    const pickupLat = parseFloat(pickupLoc.lat);
                                    const pickupLng = parseFloat(pickupLoc.lon);
                                    
                                    showRouteOnMap(pickupLat, pickupLng, destLat, destLng);
                                } else {
                                    showToast('Could not geocode pickup location', 'error');
                                }
                            })
                            .catch(error => {
                                console.error('Error geocoding pickup:', error);
                                showToast('Error finding pickup location', 'error');
                            });
                    } else {
                        // We already have pickup coordinates
                        showRouteOnMap(pickupCoords.lat, pickupCoords.lng, destLat, destLng);
                    }
                } else {
                    showToast('Could not find destination coordinates', 'error');
                }
            })
            .catch(error => {
                console.error('Error geocoding destination:', error);
                showToast('Error finding destination', 'error');
            });
    } catch (error) {
        console.error('Error calculating route:', error);
        showToast('Error calculating route', 'error');
    }
}

// Helper function to extract coordinates from a string
function extractCoordinates(locationString) {
    const coordsMatch = locationString.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    
    if (coordsMatch) {
        const lat = parseFloat(coordsMatch[1]);
        const lng = parseFloat(coordsMatch[2]);
        
        if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
    }
    
    return null;
}

// Show route on map between two coordinates
function showRouteOnMap(startLat, startLng, endLat, endLng) {
    // Clear previous route
    if (window.routingControl) {
        driverMap.removeControl(window.routingControl);
    }
    
    // Create routing control for directions
    window.routingControl = L.Routing.control({
        waypoints: [
            L.latLng(startLat, startLng),
            L.latLng(endLat, endLng)
        ],
        routeWhileDragging: false,
        lineOptions: {
            styles: [{ color: '#FF4500', weight: 6 }] // Distinctive color for the destination route
        },
        show: true,
        showAlternatives: true,
        addWaypoints: false,
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'driving'
        }),
        createMarker: function(i, waypoint, n) {
            const marker = L.marker(waypoint.latLng, {
                draggable: false,
                icon: L.divIcon({
                    className: i === 0 ? 'pickup-marker' : 'destination-marker',
                    html: i === 0 ? '<i class="fas fa-map-marker-alt"></i>' : '<i class="fas fa-flag-checkered"></i>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                })
            });
            return marker;
        }
    }).addTo(driverMap);
    
    // Fit map to show the route
    driverMap.fitBounds([
        [startLat, startLng],
        [endLat, endLng]
    ], { padding: [50, 50] });
    
    showToast('Route to destination calculated', 'success');
}

// Update completeRide function to update status
async function completeRide() {
    if (!currentRideId) {
        showToast('No active ride', 'error');
        return;
    }
    
    try {
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        
        // Update UI
        document.getElementById("status-message").textContent = "Completing ride...";
        
        // Call the contract to complete the ride
        await rideSharingContract.methods.completeRide(currentRideId)
            .send({ from: account, gas: 300000 });
        
        // Update UI after confirmation
        document.getElementById("status-message").textContent = "Ride completed successfully";
        
        // Clear the active ride display
        setTimeout(() => {
            document.getElementById("active-ride").style.display = "none";
            document.getElementById("status-message").textContent = "Ready for next ride";
            
            // Reset current ride ID
            currentRideId = null;
            
            // Update availability toggle if needed
            document.getElementById("availability-toggle").checked = true;
            
            // Clear the route from the map
            if (window.routingControl) {
                driverMap.removeControl(window.routingControl);
            }
            
            // Remove any markers except driver's location
            driverMap.eachLayer(function(layer) {
                if (layer instanceof L.Marker && layer !== driverMarker) {
                    driverMap.removeLayer(layer);
                }
            });
            
            // Check for new ride requests
            checkActiveRides();
        }, 3000);
        
        // Show earnings notification
        try {
            // Get ride details to show earnings
            const rideDetails = await rideSharingContract.methods.getRideDetails(currentRideId).call();
            const fareInEth = web3.utils.fromWei(rideDetails.fare.toString(), 'ether');
            
            // Calculate platform fee (5%)
            const platformFee = parseFloat(fareInEth) * 0.05;
            const driverEarnings = parseFloat(fareInEth) - platformFee;
            
            showToast(`Ride completed! You earned ${driverEarnings.toFixed(5)} ETH`, 'success');
            
            // Update total earnings display
            const driverDetails = await rideSharingContract.methods.getDriverDetails(account).call();
            const totalEarnings = web3.utils.fromWei(driverDetails.totalEarnings.toString(), 'ether');
            document.getElementById("total-earnings").textContent = `${totalEarnings} ETH`;
        } catch (detailsError) {
            console.error("Error getting ride details:", detailsError);
            showToast('Ride completed! Payment processed.', 'success');
        }
        
        // Update ride status
        updateRideStatus("Ride completed", 100);
    } catch (error) {
        console.error("Error completing ride:", error);
        showToast('Error completing ride: ' + error.message, 'error');
    }
}

// Make sure this is called when the page loads
window.addEventListener('load', function() {
    init();
    
    // Add direct event listener in case setupEventListeners hasn't run yet
    const switchButton = document.getElementById("switch-to-rider");
    if (switchButton) {
        switchButton.addEventListener("click", function() {
            console.log("Switch to rider button clicked (direct)");
            window.location.href = "index.html"; // or the correct path to your rider page
        });
    }
});

