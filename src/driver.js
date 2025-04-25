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
            
            // Initialize contract
            initContract();
            
            // Check if driver is registered
            checkDriverRegistration();
            
            // Initialize map
            initMap();
            
            // Set up event listeners
            setupEventListeners();
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
          "type": "function",
          "constant": true
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
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true
        },
        {
          "stateMutability": "payable",
          "type": "receive",
          "payable": true
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
          "type": "function",
          "constant": true
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
          "type": "function",
          "constant": true
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
              "internalType": "address",
              "name": "_driverAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "_amount",
              "type": "uint256"
            }
          ],
          "name": "addEarnings",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address payable",
              "name": "_driverAddress",
              "type": "address"
            }
          ],
          "name": "transferEarnings",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];
    const contractAddress = "0x68c18B11eA4789AAAc766bDC99fb4A8e394C8968"; // Replace with your contract address
    
    rideSharingContract = new web3.eth.Contract(contractABI, contractAddress);
    console.log("Contract initialized");
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
            document.getElementById("driver-rating").textContent = 
                driverDetails.totalRatings > 0 ? 
                (driverDetails.ratingSum / driverDetails.totalRatings).toFixed(1) + " ⭐" : 
                "No ratings yet";
            document.getElementById("total-earnings").textContent = 
                web3.utils.fromWei(driverDetails.totalEarnings, "ether") + " ETH";
            
            // Hide register button
            document.getElementById("register-button").style.display = "none";
            
            // Enable availability toggle
            document.getElementById("availability-toggle").disabled = false;
            
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
                    await rideSharingContract.methods.updateDriverLocation(pos.lat, pos.lng)
                        .send({ from: accounts[0] });
                } catch (error) {
                    console.error("Error updating location:", error);
                }
            },
            () => {
                console.log("Error: The Geolocation service failed.");
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

// Start listening for ride requests
function startListeningForRideRequests() {
    // Listen for RideRequested events from the contract
    rideSharingContract.events.RideRequested({})
        .on('data', function(event) {
            const rideId = event.returnValues.rideId;
            const rider = event.returnValues.rider;
            const pickup = event.returnValues.pickup;
            const destination = event.returnValues.destination;
            
            // Check if driver is available
            if (document.getElementById("availability-toggle").checked) {
                // Show ride request
                showRideRequest(rideId, rider, pickup, destination);
            }
        })
        .on('error', function(error) {
            console.error("Error listening for ride requests:", error);
        });
}

// Show a ride request
function showRideRequest(rideId, rider, pickup, destination) {
    // Remove "no requests" message if present
    const noRequestsMsg = document.querySelector(".no-requests");
    if (noRequestsMsg) {
        noRequestsMsg.remove();
    }
    
    // Create request element
    const requestElement = document.createElement("div");
    requestElement.className = "ride-request";
    requestElement.id = `request-${rideId}`;
    requestElement.innerHTML = `
        <div class="request-details">
            <p><strong>From:</strong> ${pickup}</p>
            <p><strong>To:</strong> ${destination}</p>
            <p><strong>Rider:</strong> ${rider.substr(0, 10)}...</p>
        </div>
        <div class="request-actions">
            <button class="accept-button" onclick="acceptRide('${rideId}')">Accept</button>
            <button class="decline-button" onclick="declineRide('${rideId}')">Decline</button>
        </div>
    `;
    
    // Add to requests container
    document.getElementById("requests-container").appendChild(requestElement);
    
    // Play notification sound
    const audio = new Audio('notification.mp3');
    audio.play().catch(e => console.log("Audio play failed:", e));
}

// Ride action functions
async function arrivedAtPickup() {
    // Implementation of arrivedAtPickup function
}

async function startRide() {
    // Implementation of startRide function
}

async function completeRide() {
    // Implementation of completeRide function
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
