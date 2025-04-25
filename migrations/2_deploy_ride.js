const RideManager = artifacts.require("RideManager");

module.exports = function (deployer) {
  deployer.deploy(RideManager);
};