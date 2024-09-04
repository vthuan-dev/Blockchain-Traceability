
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TraceabilityContract {
    uint256 private _batchIdCounter;

    struct Batch {
        uint256 batchId;
        string sscc;
        uint256 producerId;
        string quantity;
        uint256 productionDate;
        uint256 expiryDate;
        uint256 startDate;
        uint256 endDate;
        BatchStatus status;
        string productImageUrl;
        string certificateImageUrl;
        string farmPlotNumber;
        bytes32 dataHash;
        uint256 productId;
    }

    enum BatchStatus { Created, PendingApproval, Approved, Rejected }

    mapping(uint256 => Batch) private _batches;
    mapping(string => uint256) private _ssccToBatchId;

    event BatchCreated(uint256 indexed batchId, string sscc, uint256 producerId);

    struct BatchParams {
        string sscc;
        uint256 producerId;
        string quantity;
        string productImageUrl;
        string certificateImageUrl;
        string farmPlotNumber;
        uint256 productId;
        uint256 startDate;
        uint256 endDate;
    }

    function createBatch(
        string memory _sscc,
        uint256 _producerId,
        string memory _quantity,
        string memory _productImageUrl,
        string memory _certificateImageUrl,
        string memory _farmPlotNumber,
        uint256 _productId,
        uint256 _startDate,
        uint256 _endDate
    ) public returns (uint256) {
        BatchParams memory params = BatchParams({
            sscc: _sscc,
            producerId: _producerId,
            quantity: _quantity,
            productImageUrl: _productImageUrl,
            certificateImageUrl: _certificateImageUrl,
            farmPlotNumber: _farmPlotNumber,
            productId: _productId,
            startDate: _startDate,
            endDate: _endDate
        });

        return _createBatch(params);
    }

    function _createBatch(BatchParams memory params) private returns (uint256) {
        require(bytes(params.sscc).length == 18, "SSCC must be 18 characters long");
        require(_ssccToBatchId[params.sscc] == 0, "SSCC already exists");
        require(bytes(params.quantity).length > 0, "Quantity must not be empty");
        require(bytes(params.productImageUrl).length > 0, "Product image URL is required");
        require(bytes(params.certificateImageUrl).length > 0, "Certificate image URL is required");
        require(bytes(params.farmPlotNumber).length > 0, "Farm plot number is required");
        require(params.productId > 0, "Product ID must be valid");
        require(params.startDate > 0, "Start date is required");
        require(params.endDate > 0, "End date is required");
        require(params.startDate < params.endDate, "Start date must be before end date");

        _batchIdCounter++;
        uint256 newBatchId = _batchIdCounter;

        uint256 productionDate = block.timestamp;
        uint256 expiryDate = productionDate + 365 days;

        bytes32 dataHash = _calculateDataHash(
            params.sscc,
            params.producerId,
            params.quantity,
            productionDate,
            expiryDate,
            params.farmPlotNumber,
            params.productId
        );

        Batch memory newBatch = Batch({
            batchId: newBatchId,
            sscc: params.sscc,
            producerId: params.producerId,
            // Remove the approverId field
            quantity: params.quantity,
            productionDate: productionDate,
            expiryDate: expiryDate,
            startDate: params.startDate,
            endDate: params.endDate,
            status: BatchStatus.PendingApproval,
            productImageUrl: params.productImageUrl,
            certificateImageUrl: params.certificateImageUrl,
            farmPlotNumber: params.farmPlotNumber,
            dataHash: dataHash,
            productId: params.productId
        });

        _batches[newBatchId] = newBatch;
        _ssccToBatchId[params.sscc] = newBatchId;

        emit BatchCreated(newBatchId, params.sscc, params.producerId);
        return newBatchId;
    }

    function _calculateDataHash(
        string memory _sscc,
        uint256 _producerId,
        // Remove the approverId parameter
        string memory _quantity,
        uint256 _productionDate,
        uint256 _expiryDate,
        string memory _farmPlotNumber,
        uint256 _productId
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(_sscc, _producerId, _quantity, _productionDate, _expiryDate, _farmPlotNumber, _productId));
    }
    // hàm kiểm tra sscc đã tồn tại hay chưa 
    function ssccExists(string memory sscc) public view returns (bool) {
        return _ssccToBatchId[sscc] != 0;
    }

    // Hàm mới để lấy danh sách các lô hàng dựa trên producerId
    function getBatchesByProducer(uint256 producerId) public view returns (Batch[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= _batchIdCounter; i++) {
            if (_batches[i].producerId == producerId) {
                count++;
            }
        }

        Batch[] memory batches = new Batch[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _batchIdCounter; i++) {
            if (_batches[i].producerId == producerId) {
                batches[index] = _batches[i];
                index++;
            }
        }

        return batches;
    }
}
