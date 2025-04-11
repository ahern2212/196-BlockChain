# Simple Message Contract

A simple blockchain project that demonstrates a basic smart contract for storing and retrieving messages.

## Project Structure

- `contracts/Message.sol`: The smart contract that stores and retrieves messages
- `src/index.html`: The frontend interface
- `src/app.js`: JavaScript code to interact with the smart contract

## How to Use

### Option 1: Demo Mode (No Blockchain Required)

1. Simply open `src/index.html` in your browser
2. The demo will work without a blockchain connection
3. You can enter messages and see them displayed, but they won't be stored on a blockchain

### Option 2: Deploy to a Test Network

1. Install MetaMask browser extension
2. Deploy the contract to a test network (like Sepolia) using Remix IDE:
   - Go to [Remix IDE](https://remix.ethereum.org/)
   - Create a new file and paste the contents of `contracts/Message.sol`
   - Compile the contract
   - Deploy to a test network (make sure you have test ETH)
   - Copy the deployed contract address
3. Update the `contractAddress` in `src/app.js` with your deployed contract address
4. Open `src/index.html` in your browser
5. Connect MetaMask to the same test network
6. Now you can interact with the actual blockchain!

## Learning Resources

- [Solidity Documentation](https://docs.soliditylang.org/)
- [Web3.js Documentation](https://web3js.readthedocs.io/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [Remix IDE](https://remix.ethereum.org/) 