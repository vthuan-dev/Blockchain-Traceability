const Web3 = require('web3');

// Kết nối với Ganache
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

// ABI của hợp đồng
const contractABI = require('../build/contracts/TraceabilityContract.json').abi;

// Địa chỉ hợp đồng
const contractAddress = '0x4B35a308d09340440D73c435C83E4F1133A0A262'; // Địa chỉ hợp đồng của bạn

// Tạo đối tượng contract
const contract = new web3.eth.Contract(contractABI, contractAddress);

// Ví dụ: Tạo batch mới
async function createBatch(sscc, producerId, quantity, productImageUrl, certificateImageUrl, farmPlotNumber, productId, startDate, endDate) {
    const accounts = await web3.eth.getAccounts();
    const producer = accounts[1];

    await contract.methods.addProducer(producerId).send({ from: accounts[0] });
    const tx = await contract.methods.createBatch(
        sscc,
        producerId,
        quantity,
        productImageUrl,
        certificateImageUrl,
        farmPlotNumber,
        productId,
        startDate,
        endDate
    ).send({ from: producer });

    console.log(tx);
}

// Gọi hàm createBatch với các tham số cần thiết
createBatch("123456789012345678", "0xProducerAddress", "100", "img2.jpg", "img1.jpg", "Plot123", 1, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60));