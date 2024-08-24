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
        string certificateImageHash,
        uint approverId
    );

    event BatchApproved(uint batchId, string sscc);
    event BatchRejected(uint batchId);

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
        string certificateImageHash;
        uint approverId; // ID của nhà kiểm duyệt được chọn
    }

    struct ActivityLog {
        uint logId;
        uint batchId;
        uint userId; // ID của người dùng từ bảng users
        string activity;
    }

    Batch[] public batches;
    uint public nextBatchId;

    mapping(string => bool) private usedSSCCs;

    address public admin;

    constructor(address _admin) {
        admin = _admin;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyApprover(uint _batchId) {
        require(msg.sender == getApproverAddress(batches[_batchId].approverId), "Only the assigned approver can call this function");
        _;
    }

    function getApproverAddress(uint _approverId) internal view returns (address) {
        // Implement logic to get the approver's address by their ID
        // This could be a mapping from approverId to address
        // For example: return approvers[_approverId];
    }

    function createBatch(
        string memory _batchName,
        uint _productId,
        uint _producerId,
        uint _quantity,
        uint _productionDate,
        uint _expireDate,
        string[] memory _imageHashes,
        string memory _certificateImageHash,
        uint _approverId
    ) public {
        require(bytes(_batchName).length > 0, "Batch name is required");
        require(_quantity > 0, "Quantity must be greater than zero");
        require(_productionDate < _expireDate, "Production date must be before expire date");
        require(_imageHashes.length > 0, "At least one image hash is required");
        require(bytes(_certificateImageHash).length > 0, "Certificate image hash is required");

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
            certificateImageHash: _certificateImageHash,
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
            _certificateImageHash,
            _approverId
        );

        nextBatchId++;
    }

    function approveBatch(uint _batchId, string memory _sscc) public onlyApprover(_batchId) {
        Batch storage batch = batches[_batchId];
        require(batch.status == BatchStatus.PendingApproval, "Batch is not pending approval");

        require(!usedSSCCs[_sscc], "SSCC has already been used");

        usedSSCCs[_sscc] = true;

        batch.status = BatchStatus.Approved;
        batch.sscc = _sscc;
        emit BatchApproved(_batchId, _sscc);
    }

    function rejectBatch(uint _batchId) public onlyApprover(_batchId) {
        Batch storage batch = batches[_batchId];
        require(batch.status == BatchStatus.PendingApproval, "Batch is not pending approval");

        batch.status = BatchStatus.Rejected;
        emit BatchRejected(_batchId);
    }

    function getPendingBatches() public view returns (Batch[] memory) {
        uint pendingCount = 0;
        for (uint i = 0; i < batches.length; i++) {
            if (batches[i].status == BatchStatus.PendingApproval) {
                pendingCount++;
            }
        }

        Batch[] memory pendingBatches = new Batch[](pendingCount);
        uint index = 0;
        for (uint i = 0; i < batches.length; i++) {
            if (batches[i].status == BatchStatus.PendingApproval) {
                pendingBatches[index] = batches[i];
                index++;
            }
        }

        return pendingBatches;
    }
}