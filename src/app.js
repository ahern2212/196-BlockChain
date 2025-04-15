let web3;
let contract;
// We'll use a test network instead of a local one
const contractAddress = '0x1234567890123456789012345678901234567890'; // Replace with your deployed contract address

// Global variables
let map;
let routingControl;
let pickupMarker;
let destinationMarker;
let currentRideId;
let rideSharingContract;
let pickupCoords;
let destinationCoords;

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
window.addEventListener('load', init);

// Initialize Leaflet map
function initMap() {
    // Create map centered on a default location (San Francisco)
    map = L.map('map').setView([37.7749, -122.4194], 13);
    
    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add geocoder control for searching addresses
    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false
    }).addTo(map);
    
    // Handle geocoding results
    geocoder.on('markgeocode', function(e) {
        const result = e.geocode;
        map.setView(result.center, 13);
    });
    
    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setView([pos.lat, pos.lng], 15);
                
                // Create a marker for the current location
                L.marker([pos.lat, pos.lng]).addTo(map)
                    .bindPopup('Your Current Location')
                    .openPopup();
                
                // Set the pickup location to current location
                document.getElementById("pickup").value = "Current Location";
                pickupCoords = [pos.lat, pos.lng];
            },
            () => {
                console.log("Error: The Geolocation service failed.");
            }
        );
    }
}

// Set up event listeners
function setupEventListeners() {
    // Use current location button
    document.getElementById("use-current-location").addEventListener("click", function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    
                    // Update the pickup input and coordinates
                    document.getElementById("pickup").value = "Current Location";
                    pickupCoords = [pos.lat, pos.lng];
                    
                    // Update the map view
                    map.setView([pos.lat, pos.lng], 15);
                    
                    // Add or update the pickup marker
                    if (pickupMarker) {
                        pickupMarker.setLatLng([pos.lat, pos.lng]);
                    } else {
                        pickupMarker = L.marker([pos.lat, pos.lng]).addTo(map)
                            .bindPopup('Pickup Location')
                            .openPopup();
                    }
                },
                () => {
                    alert("Could not get your location. Please enter it manually.");
                }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    });
    
    // Calculate route button
    document.getElementById("calculate-route").addEventListener("click", calculateRoute);
    
    // Request ride button
    document.getElementById("request-ride").addEventListener("click", requestRide);
    
    // Pickup and destination input geocoding
    document.getElementById("pickup").addEventListener("change", geocodePickup);
    document.getElementById("destination").addEventListener("change", geocodeDestination);
}

// Geocode the pickup location
function geocodePickup() {
    const pickupAddress = document.getElementById("pickup").value;
    if (pickupAddress && pickupAddress !== "Current Location") {
        const geocoder = L.Control.Geocoder.nominatim();
        geocoder.geocode(pickupAddress, function(results) {
            if (results && results.length > 0) {
                const result = results[0];
                pickupCoords = [result.center.lat, result.center.lng];
                
                // Add or update the pickup marker
                if (pickupMarker) {
                    pickupMarker.setLatLng(pickupCoords);
                } else {
                    pickupMarker = L.marker(pickupCoords).addTo(map)
                        .bindPopup('Pickup Location')
                        .openPopup();
                }
                
                // Update the map view
                map.setView(pickupCoords, 15);
                
                // If destination is also set, calculate the route
                if (destinationCoords) {
                    calculateRoute();
                }
            } else {
                alert("Could not find the pickup location. Please try a different address.");
            }
        });
    }
}

// Geocode the destination location
function geocodeDestination() {
    const destinationAddress = document.getElementById("destination").value;
    if (destinationAddress) {
        const geocoder = L.Control.Geocoder.nominatim();
        geocoder.geocode(destinationAddress, function(results) {
            if (results && results.length > 0) {
                const result = results[0];
                destinationCoords = [result.center.lat, result.center.lng];
                
                // Add or update the destination marker
                if (destinationMarker) {
                    destinationMarker.setLatLng(destinationCoords);
                } else {
                    destinationMarker = L.marker(destinationCoords).addTo(map)
                        .bindPopup('Destination')
                        .openPopup();
                }
                
                // If pickup is also set, calculate the route
                if (pickupCoords) {
                    calculateRoute();
                }
            } else {
                alert("Could not find the destination. Please try a different address.");
            }
        });
    }
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

// Add event listeners after DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    // Add event listeners for the pickup and destination fields
    document.getElementById("pickup").addEventListener("change", calculateRoute);
    document.getElementById("destination").addEventListener("change", calculateRoute);
    initMap();
    setupEventListeners();
    initWeb3();
});

// Make initMap available globally for the callback
window.initMap = initMap; 