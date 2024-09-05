// 2_deploy_contracts.js
const TraceabilityContract = artifacts.require("TraceabilityContract");

module.exports = function(deployer, network, accounts) {
    const adminAddress = accounts[0]; // Sử dụng địa chỉ đầu tiên từ danh sách tài khoản
    deployer.deploy(TraceabilityContract, { from: adminAddress });
};