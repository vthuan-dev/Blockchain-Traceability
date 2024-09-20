const ActivityLog = artifacts.require("ActivityLog");
const TraceabilityContract = artifacts.require("TraceabilityContract");

module.exports = async function(deployer, network, accounts) {
    const adminAddress = accounts[0]; // Sử dụng địa chỉ đầu tiên từ danh sách tài khoản

    // Triển khai ActivityLog trước
    await deployer.deploy(ActivityLog, { from: adminAddress });
    const activityLogInstance = await ActivityLog.deployed();

    // Sau đó triển khai TraceabilityContract với địa chỉ của ActivityLog
    await deployer.deploy(TraceabilityContract, activityLogInstance.address, { from: adminAddress });
};