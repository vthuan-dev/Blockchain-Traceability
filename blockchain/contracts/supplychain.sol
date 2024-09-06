
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
      //  uint256 expiryDate;
        uint256 startDate;
        uint256 endDate;
        BatchStatus status;
        string[] productImageUrls; // Change to array
        string certificateImageUrl;
        string farmPlotNumber;
        bytes32 dataHash;
        uint256 productId;
    }
      struct ActivityLog {
        uint256 timestamp;
        uint256 uid; // Sử dụng uid thay vì address
        string activityName;
        string description;
        bool isSystemGenerated;
        string[] imageUrls;
        uint256[] relatedProductIds;
    }

    enum BatchStatus { Created, PendingApproval, Approved, Rejected }

    mapping(uint256 => Batch) private _batches;
    mapping(string => uint256) private _ssccToBatchId;
        mapping(uint256 => ActivityLog[]) private _producerActivityLogs;


    event BatchCreated(uint256 indexed batchId, string sscc, uint256 producerId);
    event ActivityLogAdded(
        uint256 indexed uid,
        string activityName,
        string description,
        bool isSystemGenerated,
        string[] imageUrls,
        uint256[] relatedProductIds
    );

    struct BatchParams {
        string sscc;
        uint256 producerId;
        string quantity;
        string[] productImageUrls; // Change to array
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
        string[] memory _productImageUrls, // Đã thay đổi thành mảng
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
            productImageUrls: _productImageUrls, // Đã sửa
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
        require(params.productImageUrls.length > 0, "At least one product image URL is required");
        require(bytes(params.certificateImageUrl).length > 0, "Certificate image URL is required");
        require(bytes(params.farmPlotNumber).length > 0, "Farm plot number is required");
        require(params.productId > 0, "Product ID must be valid");
        require(params.startDate > 0, "Start date is required");
        require(params.endDate > 0, "End date is required");
        require(params.startDate < params.endDate, "Start date must be before end date");

        _batchIdCounter++;
        uint256 newBatchId = _batchIdCounter;

        uint256 productionDate = block.timestamp;
        // uint256 expiryDate = productionDate + 5 days;

        bytes32 dataHash = _calculateDataHash(
            params.sscc,
            params.producerId,
            params.quantity,
            productionDate,
         //   expiryDate,
            params.farmPlotNumber,
            params.productId
        );

        Batch memory newBatch = Batch({
            batchId: newBatchId,
            sscc: params.sscc,
            producerId: params.producerId,
            quantity: params.quantity,
            productionDate: productionDate,
        //    expiryDate: expiryDate,
            startDate: params.startDate,
            endDate: params.endDate,
            status: BatchStatus.PendingApproval,
            productImageUrls: params.productImageUrls, // Đã sửa
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

    function addActivityLog(
        uint256 _uid,
        string memory _activityName,
        string memory _description,
        string[] memory _imageUrls,
        uint256[] memory _relatedProductIds
    ) public {
        ActivityLog memory newLog = ActivityLog({
            timestamp: block.timestamp,
            uid: _uid,
            activityName: _activityName,
            description: _description,
            isSystemGenerated: false,
            imageUrls: _imageUrls,
            relatedProductIds: _relatedProductIds
        });

        _producerActivityLogs[_uid].push(newLog);
        emit ActivityLogAdded(_uid, _activityName, _description, false, _imageUrls, _relatedProductIds);
    }
 // Hàm để lấy nhật ký hoạt động của một nhà sản xuất
    function getProducerActivityLogs(uint256 _uid) public view returns (ActivityLog[] memory) {
        return _producerActivityLogs[_uid];
    }

    
    // Hàm nội bộ để hệ thống tự động thêm nhật ký
    function _addSystemActivityLog(
        uint256 _uid,
        string memory _activityName,
        string memory _description,
        uint256[] memory _relatedProductIds
    ) internal {
        string[] memory emptyImageUrls = new string[](0);
        ActivityLog memory newLog = ActivityLog({
            timestamp: block.timestamp,
            uid: _uid,
            activityName: _activityName,
            description: _description,
            isSystemGenerated: true,
            imageUrls: emptyImageUrls,
            relatedProductIds: _relatedProductIds
        });

        _producerActivityLogs[_uid].push(newLog);
        emit ActivityLogAdded(_uid, _activityName, _description, true, emptyImageUrls, _relatedProductIds);
    }
    
    function _calculateDataHash(
        string memory _sscc,
        uint256 _producerId,
        string memory _quantity,
        uint256 _productionDate,
        // Xóa _expiryDate khỏi đây
        string memory _farmPlotNumber,
        uint256 _productId
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(_sscc, _producerId, _quantity, _productionDate, _farmPlotNumber, _productId));
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

    // hàm cập nhật trạng thái lô hàng
function updateBatchStatus(uint256 _batchId, BatchStatus _newStatus) public {
    require(_batches[_batchId].batchId != 0, "Batch does not exist");
    // Thêm kiểm tra quyền nếu cần
    _batches[_batchId].status = _newStatus;
    emit BatchStatusUpdated(_batchId, _newStatus);
}

event BatchStatusUpdated(uint256 indexed batchId, BatchStatus newStatus);

// hàm lấy thông tin lô hàng
function getBatchDetails(uint256 _batchId) public view returns (Batch memory) {
    require(_batches[_batchId].batchId != 0, "Batch does not exist");
    return _batches[_batchId];
}
function getBatchBySSCC(string memory _sscc) public view returns (Batch memory) {
    uint256 batchId = _ssccToBatchId[_sscc];
    require(batchId != 0, "Batch with this SSCC does not exist");
    return _batches[batchId];
}

function getTotalBatches() public view returns (uint256) {
    return _batchIdCounter;
}

function isProducerOfBatch(uint256 _batchId, uint256 _producerId) public view returns (bool) {
    return _batches[_batchId].producerId == _producerId;
}

// Thêm hàm này vào smart contract
function getActivityLogs(uint256 _uid) public view returns (ActivityLog[] memory) {
    return _producerActivityLogs[_uid];
}
function getActivityLogCount(uint256 _uid) public view returns (uint256) {
    return _producerActivityLogs[_uid].length;
}

}