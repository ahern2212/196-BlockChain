//this is the migration file for the ride contract
//it will deploy the ride contract and the driver contract
//the ride contract will be deployed first and then the driver contract will be deployed
//the ride contract will be deployed first because the driver contract will need to know the ride contract address
//the driver contract will be deployed second because it will need to know the ride contract address

const RideManager = artifacts.require("RideManager");
const DriverManager = artifacts.require("DriverManager");
const RideSharingPlatform = artifacts.require("RideSharingPlatform");


module.exports = function (deployer) {
  deployer.deploy(DriverManager);
  deployer.deploy(RideManager);
  deployer.deploy(RideSharingPlatform);
};
