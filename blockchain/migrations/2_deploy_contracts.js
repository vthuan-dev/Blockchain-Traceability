// 2_deploy_contracts.js
const SupplyChain = artifacts.require("SupplyChain");

module.exports = function(deployer, network, accounts) {
    const admin = accounts[0]; // Hoặc bất kỳ địa chỉ nào bạn muốn sử dụng làm admin
    deployer.deploy(SupplyChain, admin);
};