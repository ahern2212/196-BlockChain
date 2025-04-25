const RideManager = artifacts.require("RideManager");
const DriverManager = artifacts.require("DriverManager");


module.exports = function (deployer) {
  deployer.deploy(DriverManager);
  deployer.deploy(RideManager);
};
