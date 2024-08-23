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
    }


    struct ActivityLog {
        uint logId;
        uint batchId;
        uint userId; // ID của người dùng từ bảng users
        string activity;
        uint timestamp;
    }
    // dùng để lưu trữ thông tin của các batch
    Batch[] public batches;
    uint public nextBatchId;
    // dùng để lưu trữ thông tin của các activity log
    mapping(uint => ActivityLog[]) public activityLogs;

    uint public batchCount;
    uint public logCount;
    // tạo sự kiện khi một batch mới được tạo, cập nhật trạng thái của batch, và khi một activity log mới được tạo    event BatchCreated(uint batchId, string batchName, uint productId, uint producerId, uint timestamp);

    event BatchStatusUpdated(uint batchId, BatchStatus status);
    event ActivityLogged(uint logId, uint batchId, uint userId, string activity);

    function createBatch(
        string memory _batchName,
        uint _productId,
        uint _producerId,
        uint _quantity,
        uint _productionDate,
        uint _expireDate
    ) public {
        // Kiểm tra dữ liệu đầu vào
        require(bytes(_batchName).length > 0, "Batch name is required");
        require(_quantity > 0, "Quantity must be greater than zero");
        require(_productionDate < _expireDate, "Production date must be before expire date");

        // Tạo lô hàng mới
        batches.push(Batch({
            batchId: nextBatchId,
            batchName: _batchName,
            productId: _productId,
            producerId: _producerId,
            quantity: _quantity,
            productionDate: _productionDate,
            expireDate: _expireDate,
            status: BatchStatus.Created,
            timestamp: block.timestamp
        }));

        // Kích hoạt sự kiện
        emit BatchCreated(
            nextBatchId,
            _batchName,
            _productId,
            _producerId,
            _quantity,
            _productionDate,
            _expireDate,
            block.timestamp
        );

        // Tăng giá trị batchId cho lô hàng tiếp theo
        nextBatchId++;
    }

    function requestApproval(uint _batchId, uint _producerId) public {
        require(batches[_batchId].batchId != 0, "Batch does not exist");
        require(batches[_batchId].producerId == _producerId, "Only the producer can request approval");
        require(batches[_batchId].status == BatchStatus.Created, "Batch is not in Created status");
        batches[_batchId].status = BatchStatus.PendingApproval;
        emit BatchStatusUpdated(_batchId, BatchStatus.PendingApproval);
    }

    function approveBatch(uint _batchId) public {
        require(batches[_batchId].batchId != 0, "Batch does not exist");
        require(batches[_batchId].status == BatchStatus.PendingApproval, "Batch is not in Pending Approval status");
        batches[_batchId].status = BatchStatus.Approved;
        emit BatchStatusUpdated(_batchId, BatchStatus.Approved);
    }

    function logActivity(uint _batchId, uint _userId, string memory _activity) public {
        require(batches[_batchId].batchId != 0, "Batch does not exist");
        logCount++;
        activityLogs[_batchId].push(ActivityLog(logCount, _batchId, _userId, _activity, block.timestamp));
        emit ActivityLogged(logCount, _batchId, _userId, _activity);
    }

    function getActivityLogs(uint _batchId) public view returns (ActivityLog[] memory) {
        return activityLogs[_batchId];
    }
}