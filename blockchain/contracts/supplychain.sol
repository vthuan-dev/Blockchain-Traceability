// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./ActivityLog.sol";
contract TraceabilityContract {
    ActivityLog private activityLogContract;   

  constructor(address _activityLogAddress) {
    require(_activityLogAddress != address(0), "Invalid ActivityLog address");
    activityLogContract = ActivityLog(_activityLogAddress);
}

    uint256 private _batchIdCounter;
    uint256 private _warehouseIdCounter;

enum BatchStatus { PendingApproval, Approved, Rejected }
enum TransportStatus { NotTransported, InTransit, Delivered }
enum ParticipantType { Transporter, Warehouse }
enum DetailedTransportStatus { NotStarted, InTransit, Paused, Delivered }

    struct Batch {
        uint256 batchId;
        string name;  // Thêm trường tên lô hàng
        string sscc;
        uint256 producerId;
        string quantity;
        uint256 productionDate;
        uint256 startDate;
        uint256 endDate;
        BatchStatus status;
        string[] productImageUrls;
        string certificateImageUrl;
        string farmPlotNumber;
        bytes32 dataHash;
        uint256 productId;
        TransportStatus transportStatus;
        DetailedTransportStatus detailedTransportStatus;
        uint256 lastTransporterId;
        bool warehouseConfirmed;  // Thêm trường này

    }

     struct BatchParams {
        string name;
        string sscc;
        uint256 producerId;
        string quantity;
        string[] productImageUrls;
        string certificateImageUrl;
        string farmPlotNumber;
        uint256 productId;
        uint256 startDate;
        uint256 endDate;
    }
    
    struct Participation {
        uint256 participantId;
        string participantType;
        uint256 timestamp;
        string action;
    }

    struct TransportEvent {
    uint256 participantId;
    uint256 timestamp;
    string action;
    string participantType;
}

mapping(uint256 => TransportEvent[]) private _batchTransportEvents;


    mapping(uint256 => Batch) private _batches;
    mapping(string => uint256) private _ssccToBatchId;
   
    mapping(uint256 => bool) private _approvedBatches;
    mapping(uint256 => Participation[]) private _batchParticipations;
    
    event BatchApproved(uint256 indexed batchId, uint256 indexed producerId, string sscc);
    event BatchApprovedForQR(uint256 indexed batchId, uint256 indexed producerId, string sscc);
    event ParticipationRecorded(uint256 indexed batchId, uint256 participantId, string participantType, string action);
    event BatchCreated(uint256 indexed batchId, string sscc, uint256 producerId);
    event ActivityLogAdded(
        uint256 indexed uid,
        string activityName,
        string description,
        bool isSystemGenerated,
        string[] imageUrls,
        uint256[] relatedProductIds
    );
event TransportStatusUpdated(
    uint256 indexed batchId, 
    DetailedTransportStatus newStatus, 
    string action, 
    uint256 participantId, 
    string participantType
);




    function addSystemActivityLog(
        uint256 _uid,
        string memory _activityName,
        string memory _description,
        uint256[] memory _relatedProductIds
    ) internal {
        activityLogContract.addActivityLog(
            _uid,
            _activityName,
            _description,
            true,
            new string[](0),
            _relatedProductIds
        );
    }


    function createBatch(
        string memory _name,  // Thêm tham số tên lô hàng
        uint256 _producerId,
        string memory _quantity,
        string[] memory _productImageUrls,
        string memory _certificateImageUrl,
        string memory _farmPlotNumber,
        uint256 _productId,
        uint256 _startDate,
        uint256 _endDate
    ) public returns (uint256) {
        string memory sscc = generateSSCC(_producerId);
        BatchParams memory params = BatchParams({
            name: _name,  // Thêm tên lô hàng
            sscc: sscc,
            producerId: _producerId,
            quantity: _quantity,
            productImageUrls: _productImageUrls,
            certificateImageUrl: _certificateImageUrl,
            farmPlotNumber: _farmPlotNumber,
            productId: _productId,
            startDate: _startDate,
            endDate: _endDate
        });
        uint256 newBatchId = _createBatch(params);

        //Ghi lại thông tin lô hàng vào nhật ký hoạt động
    uint256[] memory relatedProductIds = new uint256[](1);
        relatedProductIds[0] = _productId;
        addSystemActivityLog(_producerId, "Batch Created", "A new batch has been created", relatedProductIds);


        return newBatchId;
    }

    function generateSSCC(uint256 _producerId) private view returns (string memory) {
        string memory prefix = "00";
        string memory companyPrefix = uint2str(_producerId);
        uint256 serialNumber = uint256(keccak256(abi.encodePacked(block.timestamp, _producerId)));
        string memory serialReference = uint2str(serialNumber);
        
        string memory ssccWithoutCheck = string(abi.encodePacked(prefix, companyPrefix, serialReference));
        uint8 checkDigit = calculateCheckDigit(ssccWithoutCheck);
        
        string memory sscc = string(abi.encodePacked(ssccWithoutCheck, uint2str(uint256(checkDigit))));
        
        return sscc;
    }

    function calculateCheckDigit(string memory _code) private pure returns (uint8) {
        bytes memory codeBytes = bytes(_code);
        uint256 sum = 0;
        for (uint256 i = 0; i < codeBytes.length; i++) {
            uint8 digit = uint8(codeBytes[i]) - 48;
            sum += (i % 2 == 0) ? digit * 3 : digit;
        }
        uint8 checkDigit = uint8((10 - (sum % 10)) % 10);
        return checkDigit;
    }

    function uint2str(uint256 _i) private pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    function _createBatch(BatchParams memory params) private returns (uint256) {
        require(_ssccToBatchId[params.sscc] == 0, "SSCC already exists");
        require(bytes(params.quantity).length > 0, "Quantity must not be empty");
        require(params.productImageUrls.length > 0, "At least one product image URL is required");
        require(bytes(params.certificateImageUrl).length > 0, "Certificate image URL is required");
        require(bytes(params.farmPlotNumber).length > 0, "Farm plot number is required");
        require(params.productId > 0, "Product ID must be valid");
        require(params.startDate > 0, "Start date is required");
        require(params.endDate > 0, "End date is required");
        require(params.startDate < params.endDate, "Start date must be before end date");
        require(bytes(params.name).length > 0, "Batch name must not be empty");

        _batchIdCounter++;
        uint256 newBatchId = _batchIdCounter;

        uint256 productionDate = block.timestamp;

        bytes32 dataHash = _calculateDataHash(
            params.sscc,
            params.producerId,
            params.quantity,
            productionDate,
            params.farmPlotNumber,
            params.productId,
            params.name  // Thêm tên lô hàng vào hàm băm
        );

        Batch memory newBatch = Batch({
            batchId: newBatchId,
            name: params.name,  // Thêm tên lô hàng
            sscc: params.sscc,
            producerId: params.producerId,
            quantity: params.quantity,
            productionDate: productionDate,
            startDate: params.startDate,
            endDate: params.endDate,
            status: BatchStatus.PendingApproval,
            productImageUrls: params.productImageUrls,
            certificateImageUrl: params.certificateImageUrl,
            farmPlotNumber: params.farmPlotNumber,
            dataHash: dataHash,
            productId: params.productId,
            transportStatus: TransportStatus.NotTransported,
            detailedTransportStatus: DetailedTransportStatus.NotStarted,
            lastTransporterId: 0,
            warehouseConfirmed: false  // Thêm trường mới này
        });

        _batches[newBatchId] = newBatch;
        _ssccToBatchId[params.sscc] = newBatchId;

        emit BatchCreated(newBatchId, params.sscc, params.producerId);
        return newBatchId;
    }
    

 // Hàm để lấy nhật ký hoạt động của một nhà sản xuất

    
    function _calculateDataHash(
        string memory _sscc,
        uint256 _producerId,
        string memory _quantity,
        uint256 _productionDate,
        string memory _farmPlotNumber,
        uint256 _productId,
        string memory _name  // Thêm tên lô hàng
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(_sscc, _producerId, _quantity, _productionDate, _farmPlotNumber, _productId, _name));
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

    // Ghi lại nhật ký hoạt động khi cập nhật trạng thái lô hàng
    uint256[] memory relatedProductIds = new uint256[](1);
    relatedProductIds[0] = _batches[_batchId].productId;
    addSystemActivityLog(_batchId, "Batch Status Updated", "The batch status has been updated", relatedProductIds);

}
function getPendingBatchesByProducer(uint256 _producerId) public view returns (Batch[] memory) {
    uint256 pendingCount = 0;
    for (uint256 i = 1; i <= _batchIdCounter; i++) {
        if (_batches[i].producerId == _producerId && _batches[i].status == BatchStatus.PendingApproval) {
            pendingCount++;
        }
    }
    Batch[] memory pendingBatches = new Batch[](pendingCount);
    uint256 index = 0;
    for (uint256 i = 1; i <= _batchIdCounter; i++) {
        if (_batches[i].producerId == _producerId && _batches[i].status == BatchStatus.PendingApproval) {
            pendingBatches[index] = _batches[i];
            index++;
        }
    }

    return pendingBatches;
}

function getRejectedBatchesByProducer(uint256 _producerId) public view returns (Batch[] memory) {
    uint256 rejectedCount = 0;
    for (uint256 i = 1; i <= _batchIdCounter; i++) {
        if (_batches[i].producerId == _producerId && _batches[i].status == BatchStatus.Rejected) {
            rejectedCount++;
        }
    }

    Batch[] memory rejectedBatches = new Batch[](rejectedCount);
    uint256 index = 0;
    for (uint256 i = 1; i <= _batchIdCounter; i++) {
        if (_batches[i].producerId == _producerId && _batches[i].status == BatchStatus.Rejected) {
            rejectedBatches[index] = _batches[i];
            index++;
        }
    }

    return rejectedBatches;
}
function getAllPendingBatches() public view returns (Batch[] memory) {
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= _batchIdCounter; i++) {
            if (_batches[i].status == BatchStatus.PendingApproval) {
                pendingCount++;
            }
        }

        Batch[] memory pendingBatches = new Batch[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= _batchIdCounter; i++) {
            if (_batches[i].status == BatchStatus.PendingApproval) {
                pendingBatches[index] = _batches[i];
                index++;
            }
        }

        return pendingBatches;
    }

event BatchStatusUpdated(uint256 indexed batchId, BatchStatus newStatus);

// hàm lấy thông tin lô hàng
function getBatchDetails(uint256 _batchId) public view returns (Batch memory) {
    require(_batches[_batchId].batchId != 0, "Batch does not exist");
    return _batches[_batchId];
}


function getTotalBatches() public view returns (uint256) {
    return _batchIdCounter;
}

function isProducerOfBatch(uint256 _batchId, uint256 _producerId) public view returns (bool) {
    return _batches[_batchId].producerId == _producerId;
}

// Thêm hàm này vào smart contract



modifier onlyApprover() {
    // Implement logic to check if msg.sender is an approver
    _;
}
function approveBatch(uint256 _batchId) public onlyApprover {
    require(_batches[_batchId].batchId != 0, "Batch does not exist");
    require(_batches[_batchId].status == BatchStatus.PendingApproval, "Batch is not pending approval");

    _batches[_batchId].status = BatchStatus.Approved;
    _approvedBatches[_batchId] = true;

    emit BatchApproved(_batchId, _batches[_batchId].producerId, _batches[_batchId].sscc);
    emit BatchApprovedForQR(_batchId, _batches[_batchId].producerId, _batches[_batchId].sscc);
    
    // Add system activity log
    uint256[] memory relatedProductIds = new uint256[](1);
        relatedProductIds[0] = _batches[_batchId].productId;
        addSystemActivityLog(_batchId, "Batch Approved", "Batch has been approved by the approver", relatedProductIds);
    }

function rejectBatch(uint256 _batchId) public onlyApprover {
    require(_batches[_batchId].batchId != 0, "Batch does not exist");
    require(_batches[_batchId].status == BatchStatus.PendingApproval, "Batch is not pending approval");

    _batches[_batchId].status = BatchStatus.Rejected;

    emit BatchRejected(_batchId, _batches[_batchId].producerId, _batches[_batchId].sscc);
    
    // Add system activity log
  uint256[] memory relatedProductIds = new uint256[](1);
        relatedProductIds[0] = _batches[_batchId].productId;
        addSystemActivityLog(_batchId, "Batch Rejected", "Batch has been rejected by the approver", relatedProductIds);
}
function getActivityLogs(uint256 _uid) public view returns (ActivityLog.ActivityLogEntry[] memory) {
    return activityLogContract.getActivityLogs(_uid);
}

event BatchRejected(uint256 indexed batchId, uint256 producerId, string sscc);


function getApprovedBatchesByProducer(uint256 _producerId) public view returns (Batch[] memory) {
    uint256 approvedCount = 0;
    for (uint256 i = 1; i <= _batchIdCounter; i++) {
        if (_batches[i].producerId == _producerId && _batches[i].status == BatchStatus.Approved) {
            approvedCount++;
        }
    }

    Batch[] memory approvedBatches = new Batch[](approvedCount);
    uint256 index = 0;
    for (uint256 i = 1; i <= _batchIdCounter; i++) {
        if (_batches[i].producerId == _producerId && _batches[i].status == BatchStatus.Approved) {
            approvedBatches[index] = _batches[i];
            index++;
        }
    }

    return approvedBatches;
}

function getBatchBySSCC(string memory _sscc) public view returns (Batch memory) {
    uint256 batchId = _ssccToBatchId[_sscc];
    require(batchId != 0, "Batch does not exist with this SSCC");
    return _batches[batchId];
}

function isValidSSCC(string memory _sscc) public view returns (bool) {
    return _ssccToBatchId[_sscc] != 0;
}

function isBatchApproved(uint256 _batchId) public view returns (bool) {
    return _approvedBatches[_batchId];
}

function recordParticipation(uint256 _batchId, uint256 _participantId, string memory _participantType, string memory _action) public {
    require(_batches[_batchId].batchId != 0, "Batch does not exist");
    _batchParticipations[_batchId].push(Participation(_participantId, _participantType, block.timestamp, _action));
    
    emit ParticipationRecorded(_batchId, _participantId, _participantType, _action);
}
event LogParticipantType(uint256 indexed batchId, string participantType);

function updateTransportStatus(
    uint256 _batchId, 
    uint256 _participantId, 
    string memory _action, 
    string memory _participantType
) public {
    require(
        keccak256(abi.encodePacked(_participantType)) == keccak256(abi.encodePacked("Transporter")) ||
        keccak256(abi.encodePacked(_participantType)) == keccak256(abi.encodePacked("Warehouse")),
        "Invalid participant type"
    );
    
    require(_batches[_batchId].batchId != 0, "Batch does not exist");
    require(_batches[_batchId].status == BatchStatus.Approved, "Batch must be approved");

    TransportEvent memory newEvent = TransportEvent({
        participantId: _participantId,
        timestamp: block.timestamp,
        action: _action,
        participantType: _participantType
    });
    
    _batchTransportEvents[_batchId].push(newEvent);
    
    if (keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("Bat dau van chuyen"))) {
        _batches[_batchId].detailedTransportStatus = DetailedTransportStatus.InTransit;
        _batches[_batchId].transportStatus = TransportStatus.InTransit;
        _batches[_batchId].lastTransporterId = _participantId;
    } else if (keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("Tam dung van chuyen"))) {
        _batches[_batchId].detailedTransportStatus = DetailedTransportStatus.Paused;
    } else if (keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("Tiep tuc van chuyen"))) {
        _batches[_batchId].detailedTransportStatus = DetailedTransportStatus.InTransit;
    } else if (keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("Hoan thanh van chuyen"))) {
        _batches[_batchId].detailedTransportStatus = DetailedTransportStatus.Delivered;
        _batches[_batchId].transportStatus = TransportStatus.Delivered;
    }
    
    emit TransportStatusUpdated(_batchId, _batches[_batchId].detailedTransportStatus, _action, _participantId, _participantType);
    uint256[] memory relatedProductIds = new uint256[](1);
    relatedProductIds[0] = _batches[_batchId].productId;
    addSystemActivityLog(_batchId, "Transport Status Updated", _action, relatedProductIds);


}
function updateTransportStatusBySSCC(
    string memory _sscc, 
    uint256 _participantId, 
    string memory _action, 
    string memory _participantType
) public {
    uint256 batchId = _ssccToBatchId[_sscc];
    require(batchId != 0, "Batch does not exist with this SSCC");
    updateTransportStatus(batchId, _participantId, _action, _participantType);
}

// Đổi tên sự kiện
// Thêm mapping để theo dõi xác nhận của các nhà kho

mapping(uint256 => mapping(uint256 => bool)) private _warehouseConfirmations;

// Thêm sự kiện để theo dõi xác nhận của các nhà kho
event WarehouseConfirmed(uint256 indexed batchId, uint256 indexed warehouseId);
function warehouseConfirmation(uint256 _batchId, uint256 _warehouseId) public {
    require(_batches[_batchId].batchId != 0, "Batch does not exist");
    require(_batches[_batchId].transportStatus == TransportStatus.Delivered, "Batch must be delivered before warehouse confirmation");
    require(_batches[_batchId].detailedTransportStatus == DetailedTransportStatus.Delivered, "Batch must be in Delivered status");
    //Nếu nhà kho đã xác nhận lô hàng thì không thể xác nhận lại
    require(!_warehouseConfirmations[_batchId][_warehouseId], "This warehouse has already confirmed this batch");
    
    // Đánh dấu nhà kho này đã xác nhận
    _warehouseConfirmations[_batchId][_warehouseId] = true;
    
    // Ghi nhận sự tham gia của nhà kho
    Participation memory newParticipation = Participation({
        participantId: _warehouseId,
        participantType: "Warehouse",
        timestamp: block.timestamp,
        action: "Confirmed receipt at warehouse"
    });
    _batchParticipations[_batchId].push(newParticipation);
    
    // Phát ra sự kiện
    emit WarehouseConfirmed(_batchId, _warehouseId);
   uint256[] memory relatedProductIds = new uint256[](1);
        relatedProductIds[0] = _batches[_batchId].productId;
        addSystemActivityLog(_batchId, "Warehouse Confirmation", "Warehouse has confirmed receipt of the batch", relatedProductIds);
    }




// Hàm để kiểm tra xem một nhà kho cụ thể đã xác nhận lô hàng chưa
function isWarehouseConfirmed(uint256 _batchId, uint256 _warehouseId) public view returns (bool) {
    return _warehouseConfirmations[_batchId][_warehouseId];
}

// Hàm để lấy danh sách các nhà kho đã xác nhận một lô hàng
function getConfirmedWarehouses(uint256 _batchId) public view returns (uint256[] memory) {
    uint256 confirmedCount = 0;
    for (uint256 i = 1; i <= _warehouseIdCounter; i++) {
        if (_warehouseConfirmations[_batchId][i]) {
            confirmedCount++;
        }
    }
    
    uint256[] memory confirmedWarehouses = new uint256[](confirmedCount);
    uint256 index = 0;
    for (uint256 i = 1; i <= _warehouseIdCounter; i++) {
        if (_warehouseConfirmations[_batchId][i]) {
            confirmedWarehouses[index] = i;
            index++;
        }
    }
    
    return confirmedWarehouses;
}
function getBatchIdBySSCC(string memory _sscc) public view returns (uint256) {
    return _ssccToBatchId[_sscc];
}

function getDetailedTransportStatus(uint256 _batchId) public view returns (DetailedTransportStatus) {
    require(_batches[_batchId].batchId != 0, "Batch does not exist");
    return _batches[_batchId].detailedTransportStatus;
}
// hàm kiểm tra trạng thái vận chuyển
function canStartTransport(uint256 _batchId, uint256 _transporterId) public view returns (bool) {
    return _batches[_batchId].detailedTransportStatus == DetailedTransportStatus.NotStarted ||
           (_batches[_batchId].detailedTransportStatus == DetailedTransportStatus.Delivered && _batches[_batchId].lastTransporterId != _transporterId);
}
function getTransportHistoryBySSCC(string memory _sscc) public view returns (TransportEvent[] memory) {
    uint256 batchId = _ssccToBatchId[_sscc];
    require(batchId != 0, "Batch does not exist with this SSCC");
    return _batchTransportEvents[batchId];
}
// Thêm hàm để kiểm tra trạng thái vận chuyển
function getBatchTransportStatus(uint256 _batchId) public view returns (TransportStatus) {
    require(_batches[_batchId].batchId != 0, "Batch does not exist");
    return _batches[_batchId].transportStatus;
}


  function getBatchActivityLogs(uint256 _batchId) public view returns (ActivityLog.ActivityLogEntry[] memory) {
        return activityLogContract.getActivityLogs(_batchId);
    }
    
    function getBatchActivityLogsBySSCC(string memory _sscc) public view returns (ActivityLog.ActivityLogEntry[] memory) {
        uint256 batchId = _ssccToBatchId[_sscc];
        require(batchId != 0, "Batch does not exist with this SSCC");
        return getBatchActivityLogs(batchId);
    }

}