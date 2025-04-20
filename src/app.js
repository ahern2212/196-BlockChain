let web3;
let contract;
// We'll use a test network instead of a local one
const contractAddress = '0x1234567890123456789012345678901234567890'; // Replace with your deployed contract address

// Global variables
let map;
let routingControl;
let pickupMarker = null;
let destinationMarker = null;
let currentRideId;
let rideSharingContract;
let pickupCoords = null;
let destinationCoords = null;

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

// Contract ABI and address - you'll need to replace these with your actual contract details
const contractABI = [/* Your contract ABI here */];

async function init() {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
            
            // For testing purposes, we'll use a simple ABI
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
                            "indexed": false,
                            "internalType": "string",
                            "name": "newMessage",
                            "type": "string"
                        }
                    ],
                    "name": "MessageUpdated",
                    "type": "event"
                },
                {
                    "inputs": [],
                    "name": "getMessage",
                    "outputs": [
                        {
                            "internalType": "string",
                            "name": "",
                            "type": "string"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "_message",
                            "type": "string"
                        }
                    ],
                    "name": "setMessage",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ];
            
            contract = new web3.eth.Contract(contractABI, contractAddress);
            
            // For testing, we'll just show a message
            document.getElementById('currentMessage').textContent = "This is a demo. To use a real contract, deploy it to a test network and update the contract address.";
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

// Initialize the app
window.addEventListener('load', async function() {
    console.log('App initialization started');
    try {
        // Wait for Google Maps to load
        if (!window.google || !window.google.maps) {
            console.log('Waiting for Google Maps to load...');
            await new Promise(resolve => {
                const checkGoogleMaps = setInterval(() => {
                    if (window.google && window.google.maps) {
                        clearInterval(checkGoogleMaps);
                        resolve();
                    }
                }, 100);
            });
            console.log('Google Maps loaded');
        }

        await initWeb3();
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
        // Create map centered on a default location (San Francisco)
        map = L.map('map').setView([37.7749, -122.4194], 13);
        console.log('Map created');
        
        // Add the OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        console.log('Map tiles added');
        
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
    });
}

// Handle map clicks
function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Get the address for the clicked location
    const geocoder = L.Control.Geocoder.nominatim();
    geocoder.reverse(e.latlng, map.options.crs.scale(map.getZoom()), function(results) {
        const address = results && results.length > 0 ? results[0].name : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        if (!pickupCoords) {
            // Set pickup location
            setPickupLocation(lat, lng, address);
            showToast('Pickup location set to: ' + address);
        } else if (!destinationCoords) {
            // Set destination location
            setDestinationLocation(lat, lng, address);
            showToast('Destination location set to: ' + address);
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
            if (!pickupCoords || !destinationCoords) {
                showToast('Please set both locations first', 'error');
                return;
            }
            if (!routingControl) {
                showToast('Please calculate the route first', 'error');
                return;
            }
            requestRide();
        });
        console.log('Request ride button listener added');
    }

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
    // Update the input field with the address
    document.getElementById("pickup").value = address;
    
    // Store the coordinates
    pickupCoords = [lat, lng];
    
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
    // Update the input field with the address
    document.getElementById("destination").value = address;
    
    // Store the coordinates
    destinationCoords = [lat, lng];
    
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
            L.latLng(pickupCoords[0], pickupCoords[1]),
            L.latLng(destinationCoords[0], destinationCoords[1])
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
        const estimatedFare = (2.5 + (distanceInMiles * 1.5)).toFixed(2);
        
        // Update the ride details
        document.getElementById("ride-details").innerHTML = `
            <p>Distance: ${distanceInMiles} miles</p>
            <p>Estimated Time: ${timeInMinutes} minutes</p>
            <p>Estimated Fare: ${estimatedFare} ETH</p>
        `;
    });
}

// Initialize Web3
async function initWeb3() {
    if (window.ethereum) {
        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
        } catch (error) {
            console.error("User denied account access");
        }
    } else if (window.web3) {
        web3 = new Web3(window.web3.currentProvider);
    } else {
        // If no injected web3 instance is detected, fall back to Ganache
        web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:7545"));
    }
    
    // Initialize the contract
    rideSharingContract = new web3.eth.Contract(contractABI, contractAddress);
    
    console.log("Web3 initialized");
}

// Request a ride
async function requestRide() {
    // Check if we have both pickup and destination
    if (!pickupCoords || !destinationCoords) {
        alert("Please enter both pickup and destination locations");
        return;
    }
    
    // Check if route has been calculated
    if (!routingControl) {
        alert("Please calculate the route first");
        return;
    }
    
    const pickup = document.getElementById("pickup").value;
    const destination = document.getElementById("destination").value;
    
    try {
        const accounts = await web3.eth.getAccounts();
        const fare = web3.utils.toWei("0.01", "ether"); // Example fare amount
        
        // Update status
        document.getElementById("status-message").innerText = "Sending transaction to blockchain...";
        
        // Call the smart contract to request a ride
        const result = await rideSharingContract.methods.requestRide(pickup, destination)
            .send({ from: accounts[0], value: fare });
        
        // Get the ride ID from the event
        currentRideId = result.events.RideRequested.returnValues.rideId;
        
        document.getElementById("status-message").innerText = "Ride requested! Waiting for a driver...";
        
        // Listen for ride accepted event
        rideSharingContract.events.RideAccepted({
            filter: { rideId: currentRideId }
        }, function(error, event) {
            if (!error) {
                const driver = event.returnValues.driver;
                document.getElementById("status-message").innerText = `Ride accepted by driver ${driver.substr(0, 10)}...`;
            }
        });
        
    } catch (error) {
        console.error("Error requesting ride:", error);
        document.getElementById("status-message").innerText = "Error requesting ride. See console for details.";
    }
}

// Function to search for a location
function searchLocation(searchQuery, type) {
    console.log('=== Search Process Started ===');
    console.log(`Searching for: "${searchQuery}" (type: ${type})`);
    
    // Show loading indicator
    const searchButton = document.querySelector(`#${type}-search`);
    const icon = searchButton?.querySelector('i');
    if (icon) {
        icon.className = 'fas fa-spinner fa-spin';
    }
    
    showToast(`Searching for ${searchQuery}...`, 'info');

    // Clean up the search query
    const cleanQuery = searchQuery.toLowerCase().trim()
        .replace(/,?\s*ca(lifornia)?$/i, '') // Remove CA or California from the end
        .replace(/[^a-z\s]/g, '') // Remove any special characters
        .trim();

    // Try to find the city in our database
    let found = false;
    for (const [city, data] of Object.entries(caCities)) {
        if (cleanQuery === city || city.includes(cleanQuery) || cleanQuery.includes(city)) {
            found = true;
            
            // Reset icon
            if (icon) {
                icon.className = 'fas fa-search';
            }

            console.log('Location found:', data);

            // Update status message
            document.getElementById("status-message").innerText = `Found: ${data.name}`;

            // Update map
            map.flyTo([data.lat, data.lng], 13, {
                duration: 1.5,
                easeLinearity: 0.25
            });

            // Set location
            if (type === 'pickup') {
                setPickupLocation(data.lat, data.lng, data.name);
                showToast('Pickup location set successfully');
            } else {
                setDestinationLocation(data.lat, data.lng, data.name);
                showToast('Destination location set successfully');
            }

            // Calculate route if both locations are set
            if (pickupCoords && destinationCoords) {
                calculateRoute();
            }
            break;
        }
    }

    if (!found) {
        // Reset icon
        if (icon) {
            icon.className = 'fas fa-search';
        }
        
        console.log('Location not found:', cleanQuery);
        showToast(`Could not find "${searchQuery}". Available cities include: Dixon, Fairfield, Vacaville, Davis, Sacramento, etc.`, 'error');
    }
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