// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SupplyChain {
    enum BatchStatus { Created, PendingApproval, Approved, Rejected }

    event BatchCreated(
        uint batchId,
        string batchName,
        uint productId,
        uint producerId,
        uint quantity,
        uint productionDate,
        uint expireDate,
        uint timestamp,
        string[] imageHashes,
        address approver,
        string productionAddress
    );

    event BatchStatusUpdated(
        uint batchId,
        BatchStatus status,
        uint timestamp
    );

    struct Batch {
        uint batchId;
        string batchName;
        uint productId;
        uint producerId;
        uint quantity;
        uint productionDate;
        uint expireDate;
        BatchStatus status;
        uint timestamp;
        string sscc;
        string[] imageHashes;
        address approver;
        string productionAddress;
    }

    Batch[] public batches;
    uint public nextBatchId;

    modifier onlyApprover(uint _batchId) {
        require(msg.sender == batches[_batchId].approver, "Only the approver can perform this action");
        _;
    }

    function createBatch(
        string memory _batchName,
        uint _productId,
        uint _producerId,
        uint _quantity,
        uint _productionDate,
        uint _expireDate,
        string[] memory _imageHashes,
        address _approver,
        string memory _productionAddress
    ) public {
        require(bytes(_batchName).length > 0, "Batch name is required");
        require(_quantity > 0, "Quantity must be greater than zero");
        require(_productionDate < _expireDate, "Production date must be before expire date");
        require(_imageHashes.length > 0, "At least one image hash is required");
        require(bytes(_productionAddress).length > 0, "Production address is required");

        batches.push(Batch({
            batchId: nextBatchId,
            batchName: _batchName,
            productId: _productId,
            producerId: _producerId,
            quantity: _quantity,
            productionDate: _productionDate,
            expireDate: _expireDate,
            status: BatchStatus.PendingApproval,
            timestamp: block.timestamp,
            sscc: "",
            imageHashes: _imageHashes,
            approver: _approver,
            productionAddress: _productionAddress
        }));

        emit BatchCreated(
            nextBatchId,
            _batchName,
            _productId,
            _producerId,
            _quantity,
            _productionDate,
            _expireDate,
            block.timestamp,
            _imageHashes,
            _approver,
            _productionAddress
        );

        nextBatchId++;
    }

    function updateBatchStatus(uint _batchId, BatchStatus _status) public onlyApprover(_batchId) {
        require(_batchId < nextBatchId, "Invalid batch ID");
        batches[_batchId].status = _status;
        emit BatchStatusUpdated(_batchId, _status, block.timestamp);
    }
}