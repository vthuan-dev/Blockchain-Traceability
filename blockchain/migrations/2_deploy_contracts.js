const ActivityLog = artifacts.require("ActivityLog");
const TraceabilityContract = artifacts.require("TraceabilityContract");

module.exports = async function(deployer) {
    // Deploy ActivityLog first
    await deployer.deploy(ActivityLog);
    const activityLogInstance = await ActivityLog.deployed();

    // Then deploy TraceabilityContract with ActivityLog's address
    await deployer.deploy(TraceabilityContract, activityLogInstance.address);
};