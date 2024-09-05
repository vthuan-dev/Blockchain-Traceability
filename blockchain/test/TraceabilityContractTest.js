const TraceabilityContract = artifacts.require("TraceabilityContract");

contract("TraceabilityContract", (accounts) => {
    let contract;

    before(async () => {
        contract = await TraceabilityContract.deployed();
    });

    it("should create a new batch", async () => {
        const sscc = "123456789012345678";
        const producerId = 1;
        const quantity = "1000";
        const productImageUrl = "img2.jpg";
        const certificateImageUrl = "img1.jpg";
        const farmPlotNumber = "FP123";
        const productId = 1;
        const startDate = 1672531200;
        const endDate = 1675119600;

        const result = await contract.createBatch(
            sscc,
            producerId,
            quantity,
            productImageUrl,
            certificateImageUrl,
            farmPlotNumber,
            productId,
            startDate,
            endDate,
            { from: accounts[0] }
        );

        const batchId = result.logs[0].args.batchId.toNumber();
        const batch = await contract.getBatchesByProducer(producerId);

        assert.strictEqual(batch.length, 1);
        assert.strictEqual(batch[0].sscc, sscc);
        assert.strictEqual(Number(batch[0].producerId), producerId); // Chuyển đổi producerId thành số
    });
});