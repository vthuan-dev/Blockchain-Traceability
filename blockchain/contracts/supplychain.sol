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
        string certificateHash,
        uint approverId
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
        string certificateHash;
        uint approverId;
    }

    Batch[] public batches;
    uint public nextBatchId;

    function createBatch(
        string memory _batchName,
        uint _productId,
        uint _producerId,
        uint _quantity,
        uint _productionDate,
        uint _expireDate,
        string[] memory _imageHashes,
        string memory _certificateHash,
        uint _approverId
    ) public {
        require(bytes(_batchName).length > 0, "Batch name is required");
        require(_quantity > 0, "Quantity must be greater than zero");
        require(_productionDate < _expireDate, "Production date must be before expire date");
        require(_imageHashes.length > 0, "At least one image hash is required");
        require(bytes(_certificateHash).length > 0, "Certificate hash is required");

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
            certificateHash: _certificateHash,
            approverId: _approverId
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
            _certificateHash,
            _approverId
        );

        nextBatchId++;
    }
}