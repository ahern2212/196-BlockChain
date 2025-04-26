/**
 * Setup and Test Local Blockchain Communication
 * 
 * This script helps set up and test communication between two addresses on a local blockchain.
 * It uses Truffle and web3 to interact with the contracts.
 * 
 * Run with: node setup_local_blockchain.js
 */

const Web3 = require('web3');
const RideManager = require('./build/contracts/RideManager.json');
const DriverManager = require('./build/contracts/DriverManager.json');

// Connect to local blockchain
const web3 = new Web3('http://127.0.0.1:7545'); // Ganache default

async function setupLocalBlockchain() {
  try {
    console.log('Setting up local blockchain communication test...');
    
    // Get accounts
    const accounts = await web3.eth.getAccounts();
    const riderAccount = accounts[0];
    const driverAccount = accounts[1];
    
    console.log(`Using rider account: ${riderAccount}`);
    console.log(`Using driver account: ${driverAccount}`);
    
    // Get network ID
    const networkId = await web3.eth.net.getId();
    console.log(`Connected to network ID: ${networkId}`);
    
    // Load RideManager contract
    const rideManagerDeployment = RideManager.networks[networkId];
    if (!rideManagerDeployment) {
      throw new Error(`RideManager not deployed on network ${networkId}. Please run 'truffle migrate --reset' first.`);
    }
    const rideManagerAddress = rideManagerDeployment.address;
    const rideManager = new web3.eth.Contract(RideManager.abi, rideManagerAddress);
    console.log(`RideManager contract loaded at address: ${rideManagerAddress}`);
    
    // Load DriverManager contract
    const driverManagerDeployment = DriverManager.networks[networkId];
    if (!driverManagerDeployment) {
      throw new Error(`DriverManager not deployed on network ${networkId}. Please run 'truffle migrate --reset' first.`);
    }
    const driverManagerAddress = driverManagerDeployment.address;
    const driverManager = new web3.eth.Contract(DriverManager.abi, driverManagerAddress);
    console.log(`DriverManager contract loaded at address: ${driverManagerAddress}`);
    
    // Test RideManager: Request a ride from rider account
    console.log('\n--- Testing ride request ---');
    const origin = "San Francisco";
    const destination = "Palo Alto";
    const cost = web3.utils.toWei('0.01', 'ether');
    
    console.log(`Requesting ride from ${origin} to ${destination} for ${web3.utils.fromWei(cost, 'ether')} ETH...`);
    const requestTx = await rideManager.methods.requestRide(origin, destination, cost)
      .send({ from: riderAccount, gas: 500000 });
    
    console.log(`Ride requested! Transaction hash: ${requestTx.transactionHash}`);
    
    // Get the ride ID from the event
    let rideId = null;
    if (requestTx.events && requestTx.events.RideRequested) {
      rideId = requestTx.events.RideRequested.returnValues.rideId;
      console.log(`Ride ID: ${rideId}`);
    } else {
      // Get the ride count and subtract 1 to get the current ride ID
      const rideCount = await rideManager.methods.rideCount().call();
      rideId = rideCount - 1;
      console.log(`Ride ID (from rideCount): ${rideId}`);
    }
    
    // Test DriverManager: Register a driver
    console.log('\n--- Testing driver registration ---');
    const driverName = "John Doe";
    const vehicleInfo = "Tesla Model 3, Black";
    const licenseNumber = "DL12345678";
    
    console.log(`Registering driver ${driverName} with ${vehicleInfo}...`);
    await driverManager.methods.registerDriver(driverName, vehicleInfo, licenseNumber)
      .send({ from: driverAccount, gas: 500000 });
    
    console.log(`Driver registered!`);
    
    // Accept the ride with driver account
    console.log('\n--- Testing ride acceptance ---');
    console.log(`Driver account ${driverAccount} is accepting ride ${rideId}...`);
    const acceptTx = await rideManager.methods.acceptRide(rideId)
      .send({ from: driverAccount, gas: 500000 });
    
    console.log(`Ride accepted! Transaction hash: ${acceptTx.transactionHash}`);
    
    // Get ride details
    const rideDetails = await rideManager.methods.getRideDetails(rideId).call();
    console.log('\n--- Ride Details ---');
    console.log(`Rider: ${rideDetails[0]}`);
    console.log(`Driver: ${rideDetails[1]}`);
    console.log(`Origin: ${rideDetails[2]}`);
    console.log(`Destination: ${rideDetails[3]}`);
    console.log(`Cost: ${web3.utils.fromWei(rideDetails[4], 'ether')} ETH`);
    console.log(`Status: ${rideDetails[5]}`);
    
    console.log('\n--- Test Complete! ---');
    console.log(`
To use these contracts in your frontend:
1. Update the contract address in your app.js to: ${rideManagerAddress}
2. Connect with MetaMask to http://127.0.0.1:7545
3. Import accounts from Ganache using their private keys
   - For rider, use the private key for: ${riderAccount}
   - For driver, use the private key for: ${driverAccount}
4. Open the app in two different browser windows or profiles
   - Connect as a rider in one window
   - Connect as a driver in the other window
    `);
    
    return { rideManagerAddress, driverManagerAddress };
  } catch (error) {
    console.error('Error during setup:', error);
    throw error;
  }
}

// Run the setup
setupLocalBlockchain()
  .then(({ rideManagerAddress, driverManagerAddress }) => {
    console.log('Setup completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  }); 