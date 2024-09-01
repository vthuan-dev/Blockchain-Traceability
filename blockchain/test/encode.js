const ethers = require('ethers');

// Kết nối với Ganache
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:7545');

// ABI của hợp đồng
const abi = [
    "event BatchCreated(uint256 indexed batchId, string sscc, uint256 producerId, uint256 approverId)"
];

// Địa chỉ hợp đồng
const contractAddress = '0x...'; // Thay thế bằng địa chỉ hợp đồng của bạn

// Tạo đối tượng contract
const contract = new ethers.Contract(contractAddress, abi, provider);

// Hash của giao dịch bạn muốn kiểm tra
const txHash = '0x...'; // Thay thế bằng hash của giao dịch

async function getEventLogs() {
    const receipt = await provider.getTransactionReceipt(txHash);
    const logs = receipt.logs;

    logs.forEach(log => {
        try {
            const parsedLog = contract.interface.parseLog(log);
            console.log('Decoded Event:', parsedLog);
        } catch (e) {
            console.log('Log không khớp với sự kiện trong ABI');
        }
    });
}

getEventLogs();