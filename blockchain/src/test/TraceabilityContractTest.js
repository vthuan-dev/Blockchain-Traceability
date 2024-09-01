const TraceabilityContract = artifacts.require("TraceabilityContract");

contract("TraceabilityContract", accounts => {
    it("should create a batch with start date and end date", async () => {
        const instance = await TraceabilityContract.deployed();
        const sscc = "123456789012345678";
        const producerId = accounts[1];
        const quantity = "100";
        const productImageUrl = "http://example.com/product.jpg";
        const certificateImageUrl = "http://example.com/certificate.jpg";
        const farmPlotNumber = "Plot123";
        const productId = 1;
        const startDate = Math.floor(Date.now() / 1000); // current timestamp
        const endDate = startDate + (30 * 24 * 60 * 60); // 30 days later

        await instance.addProducer(producerId, { from: accounts[0] });
        const tx = await instance.createBatch(
            sscc,
            producerId,
            quantity,
            productImageUrl,
            certificateImageUrl,
            farmPlotNumber,
            productId,
            startDate,
            endDate,
            { from: producerId }
        );

        // Truy cập batchId từ sự kiện
        const receipt = await tx;
        const batchCreatedEvent = receipt.logs.find(log => log.event === 'BatchCreated');
        console.log(batchCreatedEvent.args); // Thêm câu lệnh console.log để kiểm tra giá trị
        const batchId = batchCreatedEvent.args.batchId.toNumber();

        const batch = await instance.getBatchInfo(batchId);
        assert.equal(batch.startDate.toNumber(), startDate, "Start date should be set correctly");
        assert.equal(batch.endDate.toNumber(), endDate, "End date should be set correctly");
    });
});