/**
 * Script to verify if a contract exists on the blockchain
 * Run with: node verify-contract.js
 */

const Web3 = require('web3');

// Contract address to verify
const contractAddress = '0x5920477F11365B28596a2748951BA8178Dc95238';

// RPC endpoint - Ganache default
const rpcUrl = 'http://127.0.0.1:7545';

// Minimal ABI for checking contract existence
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
    }
];

async function verifyContract() {
    console.log(`Verifying contract at address: ${contractAddress}`);
    
    // Initialize Web3
    const web3 = new Web3(rpcUrl);
    console.log(`Connected to RPC endpoint: ${rpcUrl}`);
    
    try {
        // Check if address has code (is a contract)
        const code = await web3.eth.getCode(contractAddress);
        
        if (code === '0x' || code === '0x0') {
            console.error('❌ No contract found at this address!');
            return false;
        }
        
        console.log('✅ Contract code found at address');
        
        // Try to instantiate the contract
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        console.log('✅ Contract instantiated successfully');
        
        // Try to get ride count to verify the contract interface
        try {
            const rideCount = await contract.methods.rideCount().call();
            console.log(`✅ Contract verified! Current ride count: ${rideCount}`);
            return true;
        } catch (error) {
            console.error('❌ Contract function call failed:');
            console.error(error.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verifying contract:');
        console.error(error.message);
        return false;
    }
}

// Run the verification
verifyContract()
    .then(isValid => {
        if (isValid) {
            console.log('\n✅ CONTRACT VERIFIED SUCCESSFULLY');
        } else {
            console.log('\n❌ CONTRACT VERIFICATION FAILED');
        }
        
        // Exit the process
        process.exit(isValid ? 0 : 1);
    })
    .catch(error => {
        console.error('Error during verification:', error);
        process.exit(1);
    }); 