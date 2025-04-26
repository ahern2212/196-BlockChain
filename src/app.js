let web3;
let rideSharingContract;
const contractAddress = '0x3a63499187455805AD9C153F9dEEdc9b6189bf0E'; // Use the RideSharingPlatform contract address

// Global variables
let map;
let routingControl;
let pickupMarker = null;
let destinationMarker = null;
let currentRideId;
let pickupCoords = null;
let destinationCoords = null;
let pickupAddress = null; // Store the actual pickup address
let destinationAddress = null; // Store the actual destination address

// California cities database
const caCities = {
    "dixon": { lat: 38.4455, lng: -121.8233, name: "Dixon, CA" },
    "fairfield": { lat: 38.2494, lng: -122.0401, name: "Fairfield, CA" },
    "vacaville": { lat: 38.3565, lng: -121.9877, name: "Vacaville, CA" },
    "davis": { lat: 38.5449, lng: -121.7405, name: "Davis, CA" },
    "sacramento": { lat: 38.5816, lng: -121.4944, name: "Sacramento, CA" },
    "san francisco": { lat: 37.7749, lng: -122.4194, name: "San Francisco, CA" },
    "berkeley": { lat: 37.8715, lng: -122.2730, name: "Berkeley, CA" },
    "oakland": { lat: 37.8044, lng: -122.2712, name: "Oakland, CA" },
    "san jose": { lat: 37.3382, lng: -121.8863, name: "San Jose, CA" },
    "palo alto": { lat: 37.4419, lng: -122.1430, name: "Palo Alto, CA" },
    "napa": { lat: 38.2975, lng: -122.2869, name: "Napa, CA" },
    "vallejo": { lat: 38.1041, lng: -122.2566, name: "Vallejo, CA" },
    "santa rosa": { lat: 38.4404, lng: -122.7141, name: "Santa Rosa, CA" },
    "richmond": { lat: 37.9358, lng: -122.3478, name: "Richmond, CA" },
    "concord": { lat: 37.9722, lng: -122.0016, name: "Concord, CA" }
};

// Check if Leaflet Control Geocoder is loaded
window.addEventListener('load', function() {
    console.log('Checking Leaflet Control Geocoder...');
    if (!L.Control.Geocoder) {
        console.error('Leaflet Control Geocoder not loaded!');
        showToast('Error: Map search functionality not available. Please refresh the page.', 'error');
    } else {
        console.log('Leaflet Control Geocoder loaded successfully');
    }
});

// Contract ABI and address
const contractABI = [
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
                "name": "cost",
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
                "name": "cost",
                "type": "uint256"
            }
        ],
        "name": "RideRequested",
        "type": "event"
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
            },
            {
                "internalType": "int256[]",
                "name": "pickupLats",
                "type": "int256[]"
            },
            {
                "internalType": "int256[]",
                "name": "pickupLngs",
                "type": "int256[]"
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
                "name": "",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            },
            {
                "internalType": "enum RideManager.RideStatus",
                "name": "",
                "type": "uint8"
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
    }
];

async function init() {
    console.log('Starting contract initialization...');
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
            console.log('Web3 initialized successfully');
            
            // Get network ID to find the correct contract address
            const networkId = await web3.eth.net.getId();
            console.log('Connected to network ID:', networkId);
            
            // Add account selector if available
            if (window.addAccountSelector) {
                await window.addAccountSelector('Rider Account:', '.account-container', true);
            }
            
            // DIRECT CONTRACT INITIALIZATION - use the hardcoded address if fetch fails
            try {
                // ... existing code ...
            } catch (error) {
                // ... existing code ...
            }
            
            // Listen for account changes
            window.ethereum.on('accountsChanged', async (accounts) => {
                console.log('Account changed to:', accounts[0]);
                updateConnectionStatus(true, accounts[0]);
            });
            
        } catch (error) {
            console.error('Error initializing:', error);
        }
    } else {
        alert('Please install MetaMask to use this dApp!');
    }
}

async function updateMessage() {
    try {
        // For demo purposes, we'll just show a message
        document.getElementById('currentMessage').textContent = "This is a demo message. In a real deployment, this would fetch from the blockchain.";
    } catch (error) {
        console.error('Error getting message:', error);
    }
}

async function setMessage() {
    const newMessage = document.getElementById('newMessage').value;
    if (!newMessage) return;

    try {
        // For demo purposes, we'll just update the UI
        document.getElementById('currentMessage').textContent = newMessage;
        document.getElementById('newMessage').value = '';
        alert('In a real deployment, this would update the blockchain. For now, it just updates the UI.');
    } catch (error) {
        console.error('Error setting message:', error);
    }
}

// Add CSS for the loading animation
const loadingStyle = document.createElement('style');
loadingStyle.textContent = `
    .loading-text {
        display: inline-block;
        position: relative;
        color: #666;
    }
    
    .loading-text:after {
        content: '...';
        position: absolute;
        width: 0;
        right: -12px;
        animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
        0% { width: 0; }
        33% { width: 4px; }
        66% { width: 8px; }
        100% { width: 12px; }
    }
`;
document.head.appendChild(loadingStyle);

// Initialize the app
window.addEventListener('load', async function() {
    console.log('App initialization started');
    try {
        await initWeb3();
        await init();
        await initMap();
        setupEventListeners();
        console.log('App initialization completed');
    } catch (error) {
        console.error('Error during app initialization:', error);
        showToast('Error initializing the application. Please refresh the page.', 'error');
    }
});

// Initialize Leaflet map
function initMap() {
    console.log('Initializing map...');
    return new Promise((resolve) => {
        try {
            // Create map centered on a default location (San Francisco)
            map = L.map('map').setView([37.7749, -122.4194], 13);
            console.log('Map created');
            
            // Add the OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            console.log('Map tiles added');

            // Add the geocoder control
            const geocoder = L.Control.geocoder({
                defaultMarkGeocode: false
            })
            .on('markgeocode', function(e) {
                const { center, name } = e.geocode;
                map.setView(center, 15);
            })
            .addTo(map);
            
            // Try to get user's current location and center map there
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        console.log('Got user location:', pos);
                        map.setView([pos.lat, pos.lng], 15);
                        resolve();
                    },
                    (error) => {
                        console.error("Geolocation error:", error);
                        console.log("Using default location");
                        resolve();
                    }
                );
            } else {
                console.log('Geolocation not available');
                resolve();
            }

            // Add click handler to map
            map.on('click', handleMapClick);
            console.log('Map click handler added');
        } catch (error) {
            console.error('Error initializing map:', error);
            showToast('Error initializing map. Please refresh the page.', 'error');
            resolve();
        }
    });
}

// Handle map clicks
function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    console.log('Map clicked at coordinates:', { lat, lng });
    
    // Get the address for the clicked location
    const geocoder = L.Control.Geocoder.nominatim();
    geocoder.reverse(e.latlng, map.options.crs.scale(map.getZoom()), function(results) {
        const address = results && results.length > 0 ? results[0].name : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        if (!pickupCoords) {
            // Set pickup location
            console.log('Setting pickup coordinates:', { lat, lng });
            
            // Update pickup input field
            document.getElementById("pickup").value = address;
            
            // Set pickupAddress directly
            pickupAddress = address;
            
            setPickupLocation(lat, lng, address);
            showToast('Pickup location set to: ' + address);
            
            console.log('After setting pickup:');
            console.log('- Input field:', document.getElementById("pickup").value);
            console.log('- pickupAddress:', pickupAddress);
            console.log('- pickupCoords:', pickupCoords);
        } else if (!destinationCoords) {
            // Set destination location
            console.log('Setting destination coordinates:', { lat, lng });
            
            // Update destination input field
            document.getElementById("destination").value = address;
            
            // Set destinationAddress directly
            destinationAddress = address;
            
            setDestinationLocation(lat, lng, address);
            showToast('Destination location set to: ' + address);
            
            console.log('After setting destination:');
            console.log('- Input field:', document.getElementById("destination").value);
            console.log('- destinationAddress:', destinationAddress);
            console.log('- destinationCoords:', destinationCoords);
            
            // Calculate route automatically when both locations are set
            calculateRoute();
        }
    });
}

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Use current location button
    const currentLocationBtn = document.getElementById("use-current-location");
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener("click", function() {
            console.log('Current location button clicked');
            showToast('Getting your location...', 'info');
            getCurrentLocation();
        });
        console.log('Current location button listener added');
    }

    // Input field handlers for search
    const pickupInput = document.getElementById("pickup");
    if (pickupInput) {
        pickupInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                console.log('Pickup input enter pressed');
                e.preventDefault(); // Prevent form submission
                const location = this.value.trim();
                if (location) {
                    searchLocation(location, 'pickup');
                }
            }
        });
        console.log('Pickup input listener added');
    }

    const destinationInput = document.getElementById("destination");
    if (destinationInput) {
        destinationInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                console.log('Destination input enter pressed');
                e.preventDefault(); // Prevent form submission
                const location = this.value.trim();
                if (location) {
                    searchLocation(location, 'destination');
                }
            }
        });
        console.log('Destination input listener added');
    }
    
    // Search button handler for pickup
    const pickupSearchBtn = document.getElementById("pickup-search");
    if (pickupSearchBtn) {
        pickupSearchBtn.addEventListener("click", function() {
            console.log('Pickup search button clicked');
            const location = document.getElementById("pickup").value.trim();
            if (location) {
                searchLocation(location, 'pickup');
            } else {
                showToast('Please enter a pickup location', 'error');
            }
        });
        console.log('Pickup search button listener added');
    }

    // Search button handler for destination
    const destSearchBtn = document.getElementById("destination-search");
    if (destSearchBtn) {
        destSearchBtn.addEventListener("click", function() {
            console.log('Destination search button clicked');
            const location = document.getElementById("destination").value.trim();
            if (location) {
                searchLocation(location, 'destination');
            } else {
                showToast('Please enter a destination location', 'error');
            }
        });
        console.log('Destination search button listener added');
    }
    
    // Calculate route button
    const calculateRouteBtn = document.getElementById("calculate-route");
    if (calculateRouteBtn) {
        calculateRouteBtn.addEventListener("click", function() {
            console.log('Calculate route button clicked');
            if (!pickupCoords || !destinationCoords) {
                showToast('Please set both pickup and destination locations', 'error');
                return;
            }
            calculateRoute();
        });
        console.log('Calculate route button listener added');
    }
    
    // Request ride button
    const requestRideBtn = document.getElementById("request-ride");
    if (requestRideBtn) {
        requestRideBtn.addEventListener("click", function() {
            console.log('Request ride button clicked');
            if (!document.getElementById("pickup").value || !document.getElementById("destination").value) {
                showToast('Please set both locations first', 'error');
                return;
            }
            requestRide();
        });
        console.log('Request ride button listener added');
    }
    
    // Debug button for direct contract testing
    const debugBtn = document.createElement('button');
    debugBtn.textContent = 'Debug Test';
    debugBtn.style.position = 'fixed';
    debugBtn.style.bottom = '10px';
    debugBtn.style.right = '10px';
    debugBtn.style.zIndex = 1000;
    debugBtn.style.padding = '5px 10px';
    debugBtn.style.backgroundColor = '#ff5722';
    debugBtn.style.color = 'white';
    debugBtn.style.border = 'none';
    debugBtn.style.borderRadius = '4px';
    debugBtn.addEventListener('click', function() {
        console.log('Debug button clicked - running direct test');
        testContractDirectly();
    });
    document.body.appendChild(debugBtn);
    console.log('Debug button added');

    console.log('All event listeners set up successfully');
}

// Function to show toast messages
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

// Get current location with better error handling
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                
                reverseGeocode(pos.lat, pos.lng, function(locationName) {
                    setPickupLocation(pos.lat, pos.lng, locationName);
                    showToast('Current location set as pickup');
                });
            },
            (error) => {
                let errorMessage = 'Could not get your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Please allow location access to use this feature';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                showToast(errorMessage, 'error');
                useIpBasedGeolocation();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    } else {
        showToast('Geolocation is not supported by your browser', 'error');
        useIpBasedGeolocation();
    }
}

// Function to set pickup location
function setPickupLocation(lat, lng, address) {
    // IMPORTANT: Update the input field with the address
    const pickupInput = document.getElementById("pickup");
    if (pickupInput) {
        pickupInput.value = address;
        console.log('Updated pickup input field with:', address);
    }
    
    // Store the coordinates
    pickupCoords = { lat, lng };
    
    // Remove existing pickup marker if it exists
    if (pickupMarker) {
        map.removeLayer(pickupMarker);
    }
    
    // Create new pickup marker with a fallback icon
    try {
        pickupMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-marker pickup-marker',
                html: '<i class="fas fa-map-marker-alt"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        }).addTo(map);
    } catch (error) {
        console.error('Error creating custom marker, using default:', error);
        pickupMarker = L.marker([lat, lng]).addTo(map);
    }
    
    // Bind popup to marker
    pickupMarker.bindPopup('Pickup: ' + address).openPopup();
    
    // Update status message
    document.getElementById("status-message").innerHTML = 
        `<i class="fas fa-map-marker-alt"></i> Pickup set to: ${address}` +
        (!destinationCoords ? '<br>Now click on the map to set destination' : '');
}

// Function to set destination location
function setDestinationLocation(lat, lng, address) {
    // IMPORTANT: Update the input field with the address
    const destinationInput = document.getElementById("destination");
    if (destinationInput) {
        destinationInput.value = address;
        console.log('Updated destination input field with:', address);
    }
    
    // Store the coordinates
    destinationCoords = { lat, lng };
    
    // Remove existing destination marker if it exists
    if (destinationMarker) {
        map.removeLayer(destinationMarker);
    }
    
    // Create new destination marker with a fallback icon
    try {
        destinationMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-marker destination-marker',
                html: '<i class="fas fa-flag-checkered"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        }).addTo(map);
    } catch (error) {
        console.error('Error creating custom marker, using default:', error);
        destinationMarker = L.marker([lat, lng]).addTo(map);
    }
    
    // Bind popup to marker
    destinationMarker.bindPopup('Destination: ' + address).openPopup();
    
    // Update status message
    document.getElementById("status-message").innerHTML = 
        `<i class="fas fa-flag-checkered"></i> Destination set to: ${address}`;
}

// Calculate and display route
function calculateRoute() {
    // Check if we have both pickup and destination coordinates
    if (!pickupCoords || !destinationCoords) {
        alert("Please enter both pickup and destination locations");
        return;
    }
    
    // Remove existing routing control if it exists
    if (routingControl) {
        map.removeControl(routingControl);
    }
    
    // Create new routing control
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(pickupCoords.lat, pickupCoords.lng),
            L.latLng(destinationCoords.lat, destinationCoords.lng)
        ],
        routeWhileDragging: true,
        lineOptions: {
            styles: [{ color: '#6FA1EC', weight: 4 }]
        },
        createMarker: function() { return null; } // Don't create default markers
    }).addTo(map);
    
    // When route is calculated, update ride details
    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        
        // Calculate distance in miles
        const distanceInMiles = (summary.totalDistance / 1609.34).toFixed(2);
        
        // Calculate estimated time in minutes
        const timeInMinutes = Math.round(summary.totalTime / 60);
        
        // Calculate a simple fare based on distance
        const estimatedFare = (0.005 + distanceInMiles * 0.0015).toFixed(5);
        
        // Update the ride details
        document.getElementById("ride-details").innerHTML = `
            <p>Distance: ${distanceInMiles} miles</p>
            <p>Estimated Time: ${timeInMinutes} minutes</p>
            <p>Estimated Fare: ${estimatedFare} ETH</p>
        `;
    });
}

// Function to check if MetaMask is installed
// Function to check if MetaMask is installed
async function checkMetaMaskInstalled() {
    const connectWalletBtn = document.getElementById('connect-wallet');
    const statusMessage = document.getElementById('status-message');
    const rideDetails = document.getElementById('ride-details');

    const isMetaMaskInstalled = () => {
        return Boolean(window.ethereum && window.ethereum.isMetaMask);
    };

    if (isMetaMaskInstalled()) {
        // MetaMask is installed
        connectWalletBtn.innerHTML = `
            <i class="fas fa-wallet"></i>
            <span>Connect Wallet</span>
        `;

        connectWalletBtn.onclick = async () => {
            try {
                console.log('Requesting account access...');
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

                if (accounts.length > 0) {
                    console.log('Connected account:', accounts[0]);
                    updateConnectionStatus(true, accounts[0]);
                    statusMessage.innerHTML = 'Wallet connected. Ready to request a ride.';
                    rideDetails.innerHTML = '';
                }
            } catch (error) {
                console.error('Error connecting to MetaMask:', error);
                if (error.code === 4001) {
                    showToast('Please accept the connection request in MetaMask', 'error');
                } else {
                    showToast('Error connecting to MetaMask. Please try refreshing the page.', 'error');
                }
            }
        };

        return true;
    } else {
        // Browser checks
        const isCompatibleBrowser = () => {
            const ua = navigator.userAgent.toLowerCase();
            return ua.includes('chrome') || ua.includes('firefox') || ua.includes('edge') || ua.includes('opera');
        };

        if (isCompatibleBrowser()) {
            statusMessage.innerHTML = `
                <div class="metamask-notice">
                    <i class="fas fa-exclamation-circle"></i>
                    <p><strong>MetaMask Not Detected</strong></p>
                    <p>Try:</p>
                    <ul>
                        <li>Refreshing this page</li>
                        <li>Installing or enabling MetaMask</li>
                    </ul>
                </div>
            `;
            connectWalletBtn.innerHTML = `
                <i class="fas fa-sync-alt"></i>
                <span>Refresh Page</span>
            `;
            connectWalletBtn.onclick = () => window.location.reload();
        } else {
            statusMessage.innerHTML = `
                <div class="metamask-notice">
                    <i class="fas fa-exclamation-circle"></i>
                    <p><strong>Compatible Browser Required</strong></p>
                    <p>Please use Chrome, Firefox, Edge, or Opera with MetaMask installed.</p>
                </div>
            `;
            connectWalletBtn.innerHTML = `
                <i class="fas fa-download"></i>
                <span>Install MetaMask</span>
            `;
            connectWalletBtn.onclick = () => window.open('https://metamask.io/download/', '_blank');
        }

        rideDetails.innerHTML = '';
        return false;
    }
}


// Initialize Web3 and MetaMask connection
async function initWeb3() {
    console.log('Initializing Web3...');
    
    // Check if MetaMask is installed
    const isMetaMaskInstalled = await checkMetaMaskInstalled();
    
    if (isMetaMaskInstalled) {
        try {
            // Initialize Web3
            web3 = new Web3(window.ethereum);
            console.log('Web3 initialized with MetaMask');
            
            // Check if already connected
            const accounts = await web3.eth.getAccounts();
            if (accounts.length > 0) {
                console.log('Already connected account:', accounts[0]);
                updateConnectionStatus(true, accounts[0]);
            }

            // Listen for account changes
            window.ethereum.on('accountsChanged', function (accounts) {
                console.log('Account changed:', accounts[0]);
                if (accounts.length > 0) {
                    updateConnectionStatus(true, accounts[0]);
                } else {
                    updateConnectionStatus(false);
                    showToast('Please connect your wallet', 'info');
                }
            });

            // Listen for network changes
            window.ethereum.on('chainChanged', function(networkId) {
                console.log('Network changed:', networkId);
                showToast('Network changed. Reloading...', 'info');
                window.location.reload();
            });

            // Listen for MetaMask disconnect
            window.ethereum.on('disconnect', function() {
                console.log('MetaMask disconnected');
                updateConnectionStatus(false);
                showToast('Wallet disconnected', 'info');
            });

        } catch (error) {
            console.error('Error initializing Web3:', error);
            showToast('Error connecting to blockchain network', 'error');
        }
    } else {
        console.error('MetaMask not detected');
        showToast('Please install MetaMask to use this application', 'error');
    }
}

// Function to update connection status UI
function updateConnectionStatus(isConnected, account = null) {
    const connectWalletBtn = document.getElementById('connect-wallet');
    const connectionStatus = document.getElementById('connection-status');
    const statusIcon = connectionStatus.querySelector('i');
    const statusText = connectionStatus.querySelector('span');

    if (isConnected && account) {
        // Update button
        connectWalletBtn.innerHTML = `
            <i class="fas fa-wallet"></i>
            <span>${account.substring(0, 6)}...${account.substring(38)}</span>
        `;
        connectWalletBtn.style.backgroundColor = '#27ae60';

        // Update status
        connectionStatus.classList.add('connected');
        statusIcon.style.color = '#2ecc71';
        statusText.textContent = 'Connected';

        // Enable ride request functionality
        const requestRideBtn = document.getElementById('request-ride');
        if (requestRideBtn) {
            requestRideBtn.disabled = false;
        }
    } else {
        // Reset button
        connectWalletBtn.innerHTML = `
            <i class="fas fa-wallet"></i>
            <span>Connect Wallet</span>
        `;
        connectWalletBtn.style.backgroundColor = '#2ecc71';

        // Reset status
        connectionStatus.classList.remove('connected');
        statusIcon.style.color = '#e74c3c';
        statusText.textContent = 'Not connected';

        // Disable ride request functionality
        const requestRideBtn = document.getElementById('request-ride');
        if (requestRideBtn) {
            requestRideBtn.disabled = true;
        }
    }
}

// Function to verify contract is loaded
async function verifyContractLoaded() {
    // If contract is not loaded, try to load it directly
    if (!rideSharingContract) {
        console.log('Contract not loaded yet, attempting direct initialization...');
        
        try {
            // Create contract instance using hardcoded address
            rideSharingContract = new web3.eth.Contract(
                contractABI,
                contractAddress
            );
            console.log('Contract initialized directly with address:', contractAddress);
            
            // Verify contract is valid by calling a simple method
            try {
                const rideCount = await rideSharingContract.methods.rideCount().call();
                console.log('Contract verification successful - ride count:', rideCount);
                return true;
            } catch (error) {
                console.error('Contract verification failed:', error);
                return false;
            }
        } catch (error) {
            console.error('Failed to initialize contract directly:', error);
            return false;
        }
    } else {
        console.log('Contract already initialized');
        return true;
    }
}

// Adding a debug function to help diagnose contract issues
async function testContractDirectly() {
    try {
        const accounts = await web3.eth.getAccounts();
        if (!accounts || accounts.length === 0) {
            console.error('No accounts available');
            return;
        }
        
        // Create contract instance directly
        const testContract = new web3.eth.Contract(contractABI, contractAddress);
        
        // Hardcoded values for testing
        const origin = "Test Origin";
        const destination = "Test Destination";
        const cost = web3.utils.toWei('0.01', 'ether');
        
        console.log('DIRECT TEST: Sending hardcoded values to contract:');
        console.log('Origin:', origin);
        console.log('Destination:', destination);
        console.log('Cost:', cost);
        console.log('From:', accounts[0]);
        
        const result = await testContract.methods.requestRide(origin, destination, cost)
            .send({ from: accounts[0], gas: 500000 });
            
        console.log('DIRECT TEST RESULT:', result);
        return true;
    } catch (error) {
        console.error('DIRECT TEST FAILED:', error);
        return false;
    }
}

// Rider's active ride ID
let activeRideId = null;
let rideStatusPoller = null;

// Function to request a ride - modified to show ride status panel
async function requestRide() {
    try {
        console.log('======= RIDE REQUEST INITIATED =======');
        
        // DIRECT APPROACH: Get values directly from input elements
        const pickupInputEl = document.getElementById("pickup");
        const destinationInputEl = document.getElementById("destination");
        
        if (!pickupInputEl || !destinationInputEl) {
            console.error('Missing input elements!');
            showToast('Error: Input elements not found', 'error');
            return;
        }
        
        // Get the values from the input fields - this is the exact approach that worked in our test
        const pickup = pickupInputEl.value.trim();
        const destination = destinationInputEl.value.trim();
        
        // Check if we have valid inputs
        if (!pickup || !destination) {
            showToast('Please set both pickup and destination locations', 'error');
            return;
        }
        
        console.log('RIDE DETAILS:');
        console.log('Pickup:', pickup);
        console.log('Destination:', destination);

        // Check if account is connected
        const accounts = await web3.eth.getAccounts();
        if (!accounts || accounts.length === 0) {
            showToast('Please connect your wallet first', 'error');
            return;
        }
        console.log('From account:', accounts[0]);

        // Check if contract is initialized
        if (!rideSharingContract) {
            // Direct initialization - same as in the test page
            console.log('Initializing contract directly');
            rideSharingContract = new web3.eth.Contract(contractABI, contractAddress);
        }

        // Calculate ride cost (this can be based on distance or fixed amount)
        const cost = web3.utils.toWei('0.01', 'ether'); // 0.01 ETH for testing
        console.log('Cost:', cost, 'wei');

        console.log('Sending transaction to contract...');
        
        // Show loading state
        const requestBtn = document.getElementById('request-ride');
        requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting...';
        requestBtn.disabled = true;
        
        const result = await rideSharingContract.methods.requestRide(
            pickup,
            destination,
            cost
        ).send({ 
            from: accounts[0],
            gas: 500000
        });

        console.log('Transaction result:', result);

        // Check if transaction was successful
        if (result.status) {
            // Extract ride ID from the event or get it from the result
            let rideId;
            if (result.events && result.events.RideRequested) {
                rideId = result.events.RideRequested.returnValues.rideId;
            } else {
                // Fallback if event not found
                rideId = await getLastRideId(accounts[0]);
            }
            
            activeRideId = rideId;
            
            console.log('SUCCESS! Ride requested. Ride ID:', rideId);
            showToast(`Ride requested successfully!`, 'success');
            
            // Update UI to show ride status panel
            document.getElementById('active-pickup').textContent = pickup;
            document.getElementById('active-destination').textContent = destination;
            document.getElementById('active-fare').textContent = `${web3.utils.fromWei(cost, 'ether')} ETH`;
            
            // Show the active ride panel
            document.getElementById('active-ride-panel').style.display = 'block';
            
            // Hide ride form if necessary
            const rideForm = document.querySelector('.ride-form');
            if (rideForm) {
                rideForm.style.display = 'none';
            }
            
            // Set initial ride status
            updateRideStatus('requested');
            
            // Start polling for ride status updates
            startRideStatusPolling(rideId);
            
            // Reset request button
            requestBtn.innerHTML = '<i class="fas fa-car"></i> Request Ride';
            requestBtn.disabled = false;
        } else {
            showToast('Transaction failed', 'error');
            // Reset request button
            requestBtn.innerHTML = '<i class="fas fa-car"></i> Request Ride';
            requestBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error requesting ride:', error);
        showToast(error.message || 'Failed to request ride', 'error');
        
        // Reset request button
        const requestBtn = document.getElementById('request-ride');
        requestBtn.innerHTML = '<i class="fas fa-car"></i> Request Ride';
        requestBtn.disabled = false;
    }
}

// Get the last ride ID for an account
async function getLastRideId(account) {
    try {
        // Get all rides for this user
        const rides = await rideSharingContract.methods.getUserRides(account).call();
        if (rides && rides.length > 0) {
            return rides[rides.length - 1];
        }
        return null;
    } catch (error) {
        console.error('Error getting last ride ID:', error);
        return null;
    }
}

// Function to start polling for ride status updates
function startRideStatusPolling(rideId) {
    // Clear any existing poller
    if (rideStatusPoller) {
        clearInterval(rideStatusPoller);
    }
    
    // Poll every 5 seconds
    rideStatusPoller = setInterval(() => {
        checkRideStatus(rideId);
    }, 5000);
    
    // Immediately check status
    checkRideStatus(rideId);
}

// Function to check ride status
async function checkRideStatus(rideId) {
    try {
        // Get current ride details
        const rideDetails = await rideSharingContract.methods.getRideDetails(rideId).call();
        console.log('Ride details:', rideDetails);
        
        // Status codes: 0 = Requested, 1 = Accepted, 2 = Started, 3 = Completed, 4 = Declined
        const statusCode = parseInt(rideDetails[5]); // Access status from the returned array
        
        // Update ride status based on contract state
        switch(statusCode) {
            case 0: // Requested
                updateRideStatus('requested');
                
                // Add waiting for driver message to driver info
                document.getElementById('driver-name').innerHTML = 
                    '<span class="loading-text">Waiting for driver...</span>';
                document.getElementById('driver-vehicle').textContent = '';
                document.getElementById('driver-rating').textContent = '';
                
                // Make sure the active ride panel is visible
                document.getElementById('active-ride-panel').style.display = 'block';
                break;
                
            case 1: // Accepted
                updateRideStatus('accepted');
                // Make sure the active ride panel is visible
                document.getElementById('active-ride-panel').style.display = 'block';
                
                // Show driver info when ride is accepted
                if (rideDetails[1] && rideDetails[1] !== '0x0000000000000000000000000000000000000000') {
                    try {
                        await getDriverInformation(rideDetails[1]);
                        
                        // For demo purposes, simulate driver arrival after a delay
                        setTimeout(() => {
                            showDriverArrivedNotification();
                            updateRideStatus('arrived');
                        }, 10000); // Show driver arrival 10 seconds after acceptance
                    } catch (driverInfoError) {
                        console.error('Error getting driver information:', driverInfoError);
                        // Basic driver display using address
                        document.getElementById('driver-name').textContent = 
                            'Driver #' + rideDetails[1].substring(0, 6);
                        document.getElementById('driver-vehicle').textContent = 'Vehicle information unavailable';
                        document.getElementById('driver-rating').textContent = '4.5⭐';
                    }
                } else {
                    // If no driver address, display default waiting message
                    document.getElementById('driver-name').innerHTML = 
                        '<span class="loading-text">Connecting to driver...</span>';
                }
                break;
                
            case 2: // Started
                updateRideStatus('inprogress');
                break;
                
            case 3: // Completed
                updateRideStatus('completed');
                // Stop polling once ride is completed
                if (rideStatusPoller) {
                    clearInterval(rideStatusPoller);
                    rideStatusPoller = null;
                }
                
                // Show ride completion screen after a delay
                setTimeout(() => {
                    showRideCompletionScreen(rideId, {
                        fare: rideDetails[4] // Get fare from the array
                    });
                }, 2000);
                break;
                
            case 4: // Declined
                // Handle declined ride
                showToast('Your ride request was declined by the driver', 'error');
                resetRideRequest();
                break;
                
            default:
                console.log('Unknown ride status:', statusCode);
        }
    } catch (error) {
        console.error('Error checking ride status:', error);
    }
}

// Update ride status UI
function updateRideStatus(status) {
    // Reset all statuses
    document.querySelectorAll('.status-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Activate current status and all previous ones
    switch(status) {
        case 'completed':
            document.getElementById('status-completed').classList.add('active');
            // fall through
        case 'inprogress':
            document.getElementById('status-inprogress').classList.add('active');
            // fall through
        case 'arrived':
            document.getElementById('status-arrived').classList.add('active');
            // fall through
        case 'accepted':
            document.getElementById('status-accepted').classList.add('active');
            // fall through
        case 'requested':
            document.getElementById('status-requested').classList.add('active');
            break;
    }
    
    // Update estimated arrival text
    updateEstimatedArrival(status);
}

// Update estimated arrival time based on status
function updateEstimatedArrival(status) {
    const estimatedArrivalEl = document.getElementById('estimated-arrival');
    
    if (status === 'requested') {
        estimatedArrivalEl.textContent = 'Waiting for driver...';
    } else if (status === 'accepted') {
        // Generate a random ETA between 3-10 minutes
        const eta = Math.floor(Math.random() * 8) + 3;
        estimatedArrivalEl.textContent = `${eta} minutes`;
    } else if (status === 'arrived') {
        estimatedArrivalEl.textContent = 'Driver has arrived!';
    } else if (status === 'inprogress') {
        // Calculate destination ETA (random for demo)
        const eta = Math.floor(Math.random() * 15) + 5;
        estimatedArrivalEl.textContent = `${eta} minutes to destination`;
    } else if (status === 'completed') {
        estimatedArrivalEl.textContent = 'Ride completed';
    }
}

// Get driver information
async function getDriverInformation(driverAddress) {
    try {
        console.log('Getting driver information for address:', driverAddress);
        
        // Check if the method exists in the contract
        if (!rideSharingContract.methods.getDriverDetails) {
            console.log('getDriverDetails method not found in contract, using fallback');
            // Use fallback to display something
            document.getElementById('driver-name').textContent = 'Driver #' + driverAddress.substring(0, 6);
            document.getElementById('driver-vehicle').textContent = 'Vehicle information unavailable';
            document.getElementById('driver-rating').textContent = (4 + Math.random()).toFixed(1) + '⭐';
            
            showToast(`Driver has been assigned to your ride`, 'success');
            return;
        }
        
        // Get driver details from contract
        const driverDetails = await rideSharingContract.methods.getDriverDetails(driverAddress).call();
        console.log('Driver details:', driverDetails);
        
        // Update UI with driver info - handling both array and object formats
        let driverName, vehicleInfo;
        
        if (Array.isArray(driverDetails)) {
            // Array format: [name, vehicleInfo, license, isAvailable, totalRides]
            driverName = driverDetails[0] || 'Unknown Driver';
            vehicleInfo = driverDetails[1] || 'Vehicle information unavailable';
        } else if (typeof driverDetails === 'object') {
            // Object format
            driverName = driverDetails.name || 'Unknown Driver';
            vehicleInfo = driverDetails.vehicleInfo || 'Vehicle information unavailable';
        } else {
            // Fallback
            driverName = 'Unknown Driver';
            vehicleInfo = 'Vehicle information unavailable';
        }
        
        document.getElementById('driver-name').textContent = driverName;
        document.getElementById('driver-vehicle').textContent = vehicleInfo;
        
        // Set a random rating between 4.0 and 5.0 for demo purposes
        const randomRating = (4 + Math.random()).toFixed(1);
        document.getElementById('driver-rating').textContent = `${randomRating}⭐`;
        
        // Show driver assigned notification
        showToast(`Driver ${driverName} has been assigned to your ride`, 'success');
    } catch (error) {
        console.error('Error getting driver information:', error);
        // Fallback to using driver address as identifier
        document.getElementById('driver-name').textContent = 'Driver #' + driverAddress.substring(0, 8);
        document.getElementById('driver-vehicle').textContent = 'Vehicle information unavailable';
        document.getElementById('driver-rating').textContent = '4.5⭐';
        
        showToast('Driver has been assigned to your ride', 'success');
    }
}

// Check if driver has arrived (in a real app this would be event-based)
function checkIfDriverArrived() {
    // For demo purposes, show driver arrival after a random delay (5-15 seconds)
    const arrivalDelay = Math.floor(Math.random() * 10000) + 5000;
    
    setTimeout(() => {
        // Show driver arrived notification
        showDriverArrivedNotification();
        
        // Update ride status
        updateRideStatus('arrived');
    }, arrivalDelay);
}

// Show driver arrival notification
function showDriverArrivedNotification() {
    // Check if notification already exists
    if (document.querySelector('.driver-arrived-notification')) {
        return; // Don't create duplicate notifications
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'driver-arrived-notification';
    notification.innerHTML = `
        <i class="fas fa-map-marker-alt"></i>
        <div>
            <strong>Your driver has arrived!</strong>
            <p>Please proceed to the pickup location.</p>
        </div>
    `;
    
    // Add notification to the top of the ride panel
    const ridePanel = document.getElementById('active-ride-panel');
    ridePanel.insertBefore(notification, ridePanel.firstChild);
    
    // Play notification sound
    try {
        const audio = new Audio('notification.mp3');
        audio.play().catch(e => console.log("Audio play failed:", e));
    } catch (e) {
        console.log("Could not play notification sound:", e);
    }
    
    // Remove notification after 10 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 10000);
}

// Show ride completion screen
function showRideCompletionScreen(rideId, rideDetails) {
    // Create a completion overlay
    const overlay = document.createElement('div');
    overlay.className = 'completion-overlay';
    
    const fare = web3.utils.fromWei(rideDetails.fare.toString(), 'ether');
    
    overlay.innerHTML = `
        <div class="completion-card">
            <div class="completion-header">
                <i class="fas fa-check-circle"></i>
                <h2>Ride Completed</h2>
            </div>
            <div class="completion-details">
                <p>Thank you for using our ride-sharing service!</p>
                <p>Your fare: <strong>${fare} ETH</strong></p>
                <div class="rating-container">
                    <p>Rate your driver:</p>
                    <div class="star-rating">
                        <i class="fas fa-star" data-rating="1"></i>
                        <i class="fas fa-star" data-rating="2"></i>
                        <i class="fas fa-star" data-rating="3"></i>
                        <i class="fas fa-star" data-rating="4"></i>
                        <i class="fas fa-star" data-rating="5"></i>
                    </div>
                </div>
            </div>
            <button id="close-completion" class="completion-button">Done</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add star rating functionality
    const stars = overlay.querySelectorAll('.fa-star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.getAttribute('data-rating');
            
            // Remove active class from all stars
            stars.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked star and all previous ones
            stars.forEach(s => {
                if (s.getAttribute('data-rating') <= rating) {
                    s.classList.add('active');
                }
            });
            
            // Submit rating to contract
            submitDriverRating(rideId, rating);
        });
    });
    
    // Close button functionality
    document.getElementById('close-completion').addEventListener('click', function() {
        overlay.remove();
        resetRideRequest();
    });
    
    // Add CSS for the completion screen
    const style = document.createElement('style');
    style.textContent = `
        .completion-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .completion-card {
            background-color: white;
            border-radius: 10px;
            width: 90%;
            max-width: 400px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        }
        
        .completion-header {
            margin-bottom: 20px;
        }
        
        .completion-header i {
            font-size: 3rem;
            color: #4CAF50;
            margin-bottom: 10px;
        }
        
        .completion-details {
            margin-bottom: 20px;
        }
        
        .rating-container {
            margin-top: 20px;
        }
        
        .star-rating {
            font-size: 2rem;
            color: #ccc;
        }
        
        .star-rating i {
            cursor: pointer;
            transition: color 0.2s;
        }
        
        .star-rating i:hover,
        .star-rating i.active {
            color: #FFD700;
        }
        
        .completion-button {
            padding: 10px 30px;
            background-color: #4285F4;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            cursor: pointer;
        }
    `;
    
    document.head.appendChild(style);
}

// Submit driver rating
async function submitDriverRating(rideId, rating) {
    try {
        const accounts = await web3.eth.getAccounts();
        
        await rideSharingContract.methods.rateDriver(rideId, rating)
            .send({ from: accounts[0], gas: 200000 });
        
        showToast('Rating submitted. Thank you for your feedback!', 'success');
    } catch (error) {
        console.error('Error submitting rating:', error);
        showToast('Failed to submit rating', 'error');
    }
}

// Reset ride request UI
function resetRideRequest() {
    // Clear active ride ID
    activeRideId = null;
    
    // Stop polling for status updates
    if (rideStatusPoller) {
        clearInterval(rideStatusPoller);
        rideStatusPoller = null;
    }
    
    // Hide active ride panel
    document.getElementById('active-ride-panel').style.display = 'none';
    
    // Show ride request form
    document.getElementById('ride-request-section').style.display = 'block';
    
    // Reset form fields
    document.getElementById('pickup').value = '';
    document.getElementById('destination').value = '';
    
    // Clear the route from the map
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    
    // Clear all markers except user location
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker && layer !== userLocationMarker) {
            map.removeLayer(layer);
        }
    });
}

// Function to search for a location
function searchLocation(searchQuery, type) {
    console.log(`=== Search Process Started ===`);
    console.log(`Searching for: "${searchQuery}" (type: ${type})`);

    // Use Nominatim for geocoding
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`;
    
    fetch(searchUrl)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const location = data[0];
                const lat = parseFloat(location.lat);
                const lng = parseFloat(location.lon);
                const displayName = location.display_name;
                
                console.log('Location found:', {
                    lat: lat,
                    lng: lng,
                    name: displayName
                });

                if (type === 'pickup') {
                    console.log('Setting pickup location from search:', { lat, lng, displayName });
                    
                    // Directly set pickup address
                    pickupAddress = displayName;
                    
                    // Update input field
                    document.getElementById('pickup').value = displayName;
                    
                    setPickupLocation(lat, lng, displayName);
                    
                    console.log('After setting pickup from search:');
                    console.log('- Input field:', document.getElementById('pickup').value);
                    console.log('- pickupAddress:', pickupAddress);
                    console.log('- pickupCoords:', pickupCoords);
                } else {
                    console.log('Setting destination location from search:', { lat, lng, displayName });
                    
                    // Directly set destination address
                    destinationAddress = displayName;
                    
                    // Update input field
                    document.getElementById('destination').value = displayName;
                    
                    setDestinationLocation(lat, lng, displayName);
                    
                    console.log('After setting destination from search:');
                    console.log('- Input field:', document.getElementById('destination').value);
                    console.log('- destinationAddress:', destinationAddress);
                    console.log('- destinationCoords:', destinationCoords);
                }

                // Center map on the found location
                map.setView([lat, lng], 15);
                
                // If both locations are set, calculate the route
                if (pickupCoords && destinationCoords) {
                    console.log('Both locations set, calculating route with:', {
                        pickup: pickupCoords,
                        destination: destinationCoords
                    });
                    calculateRoute();
                }
            } else {
                console.log(`Location not found: ${searchQuery}`);
                showToast(`Could not find "${searchQuery}". Please try a different address.`, 'error');
            }
        })
        .catch(error => {
            console.error('Error searching location:', error);
            showToast('Error searching for location. Please try again.', 'error');
        });
}

// Make initMap available globally for the callback
window.initMap = initMap;

// Function to use IP-based geolocation
function useIpBasedGeolocation() {
    document.getElementById("status-message").innerText = "Trying IP-based location...";
    
    // Using ipinfo.io API - replace with your actual token
    fetch('https://ipinfo.io/json?token=7f35172398fbf8')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("IP geolocation data:", data);
            if (data.loc) {
                const [lat, lng] = data.loc.split(',').map(coord => parseFloat(coord));
                
                // Create location name using city and region
                let locationName = "Current Location";
                
                if (data.city && data.region) {
                    locationName = `${data.city}, ${data.region}`;
                } else if (data.city) {
                    locationName = data.city;
                } else if (data.region) {
                    locationName = data.region;
                }
                
                setPickupLocation(lat, lng, locationName);
                document.getElementById("status-message").innerText = "Location set using IP address.";
            } else {
                document.getElementById("status-message").innerText = "Could not determine location from IP.";
                enableMapClickLocation();
            }
        })
        .catch(error => {
            console.error("IP geolocation error:", error);
            document.getElementById("status-message").innerText = "Error getting location from IP.";
            enableMapClickLocation();
        });
}

// Function to do reverse geocoding (get address from coordinates)
function reverseGeocode(lat, lng, callback) {
    // Using Nominatim for reverse geocoding (free OpenStreetMap service)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log("Reverse geocode data:", data);
            let locationName = "Current Location";
            
            if (data && data.display_name) {
                // Extract a simplified address
                const parts = data.display_name.split(',');
                if (parts.length >= 2) {
                    locationName = `${parts[0].trim()}, ${parts[1].trim()}`;
                } else {
                    locationName = data.display_name;
                }
            }
            
            callback(locationName);
        })
        .catch(error => {
            console.error("Reverse geocoding error:", error);
            callback("Current Location");
        });
}

// Enable map click location
function enableMapClickLocation() {
    if (map) {
        showToast('Click on the map to set your location', 'info');
        document.getElementById("status-message").innerText = "Click on the map to set your location";
    } else {
        showToast('Map not initialized properly', 'error');
    }
}

// Add event listener for the switch button
document.getElementById("switch-to-driver").addEventListener("click", function() {
    window.location.href = "driver.html";
});

// Add account selector to the UI
async function addAccountSelector() {
    try {
        // Get all accounts
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        // Find or create the account selector container
        let selectorContainer = document.getElementById('account-selector-container');
        if (!selectorContainer) {
            // Create the container if it doesn't exist
            selectorContainer = document.createElement('div');
            selectorContainer.id = 'account-selector-container';
            selectorContainer.className = 'account-selector';
            
            // Insert after connection status
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus && connectionStatus.parentNode) {
                connectionStatus.parentNode.insertBefore(selectorContainer, connectionStatus.nextSibling);
            } else {
                // Fallback - add to the top of the ride details section
                const rideDetails = document.querySelector('.ride-details');
                if (rideDetails) {
                    rideDetails.prepend(selectorContainer);
                }
            }
        }
        
        // Clear existing content
        selectorContainer.innerHTML = '';
        
        // Add a label
        const label = document.createElement('div');
        label.textContent = 'Rider Account:';
        label.className = 'account-label';
        selectorContainer.appendChild(label);
        
        // Create the selector
        const selector = document.createElement('select');
        selector.id = 'account-selector';
        selector.className = 'account-dropdown';
        
        // Add options for each account
        accounts.forEach((account, index) => {
            const option = document.createElement('option');
            option.value = account;
            option.textContent = `${account.substring(0, 8)}...${account.substring(account.length - 6)}`;
            
            // Select the current account
            if (account === window.ethereum.selectedAddress) {
                option.selected = true;
            }
            
            selector.appendChild(option);
        });
        
        // Add change event
        selector.addEventListener('change', async function() {
            const selectedAccount = this.value;
            console.log('Switching to account:', selectedAccount);
            
            try {
                // Request account switch
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: await window.ethereum.request({ method: 'eth_chainId' }) }],
                });
                
                await window.ethereum.request({
                    method: 'eth_requestAccounts',
                    params: [{ eth_accounts: [selectedAccount] }],
                });
                
                // Force refresh after short delay to ensure account change takes effect
                setTimeout(() => {
                    location.reload();
                }, 500);
            } catch (error) {
                console.error('Error switching account:', error);
                alert('Could not switch account. Please try manually switching in MetaMask.');
            }
        });
        
        selectorContainer.appendChild(selector);
        
        // Add some CSS for the account selector
        const style = document.createElement('style');
        style.textContent = `
            .account-selector {
                margin: 10px 0;
                padding: 8px;
                background-color: #f5f5f5;
                border-radius: 4px;
                display: flex;
                align-items: center;
            }
            .account-label {
                margin-right: 10px;
                font-weight: bold;
            }
            .account-dropdown {
                padding: 5px;
                border-radius: 4px;
                border: 1px solid #ddd;
                background-color: white;
                flex-grow: 1;
            }
        `;
        document.head.appendChild(style);
        
    } catch (error) {
        console.error('Error setting up account selector:', error);
    }
}

// Check for active ride
async function checkActiveRide() {
    try {
        // Get active ride requests
        const activeRideRequests = await rideSharingContract.methods.getActiveRideRequests().call();
        
        // Check if there are active ride requests
        if (activeRideRequests.length > 0) {
            console.log('Active ride requests found:', activeRideRequests);
            showToast('Active ride requests found. Please check your ride history.', 'info');
        } else {
            console.log('No active ride requests found');
            showToast('No active ride requests found. You can request a new ride.', 'info');
        }
    } catch (error) {
        console.error('Error checking active ride:', error);
        showToast('Error checking active ride. Please try again later.', 'error');
    }
}

