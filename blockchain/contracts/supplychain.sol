// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TraceabilityContract {
    mapping(uint256 => bool) private _producers;
    mapping(uint256 => bool) private _approvers;
    uint256 private _admin;

    bool private _paused;
    uint256 private _batchIdCounter;

    struct Batch {
        uint256 batchId;
        string sscc;
        uint256 producerId;
        uint256 approverId;
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

    enum BatchStatus { Created, PendingApproval, Approved, Rejected }

    mapping(uint256 => Batch) private _batches;
    mapping(string => uint256) private _ssccToBatchId;

    enum ActivityType { SystemGenerated, UserGenerated }

    struct SystemActivity {
        uint256 timestamp;
        string action;
        uint256 batchId;
        uint256 userId;
    }

    struct UserActivity {
        uint256 timestamp;
        string action;
        uint256 batchId;
        string details;
        string imageHash;
        uint256 userId;
    }

    mapping(uint256 => SystemActivity[]) private _systemActivities;
    mapping(uint256 => UserActivity[]) private _userActivities;

    event NewSystemActivity(uint256 indexed userId, string action, uint256 batchId);
    event NewUserActivity(uint256 indexed userId, string action, uint256 batchId, string details, string imageHash);
    event BatchCreated(uint256 indexed batchId, string sscc, uint256 producerId, uint256 approverId);

    constructor() {
        _admin = uint256(uint160(msg.sender));
    }

    modifier onlyAdmin() {
        require(uint256(uint160(msg.sender)) == _admin, "Only admin can perform this action");
        _;
    }

    modifier onlyProducer() {
        require(_producers[uint256(uint160(msg.sender))], "Only producer can perform this action");
        _;
    }

    modifier onlyApprover() {
        require(_approvers[uint256(uint160(msg.sender))], "Only approver can perform this action");
        _;
    }

    modifier whenNotPaused() {
        require(!_paused, "Contract is paused");
        _;
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
    ) public whenNotPaused returns (uint256) {
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

        require(_producers[params.producerId], "Only producer can perform this action");
        require(params.producerId == uint256(uint160(msg.sender)), "ProducerId must match the caller");

        _batchIdCounter++;
        uint256 newBatchId = _batchIdCounter;

        uint256 productionDate = block.timestamp;
        uint256 expiryDate = productionDate + 365 days;

        bytes32 dataHash = _calculateDataHash(
            params.sscc,
            params.producerId,
            0,
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
            approverId: 0,
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

        _logSystemActivity(params.producerId, "Created Batch", newBatchId);

        emit NewSystemActivity(params.producerId, "Created Batch", newBatchId);
        emit BatchCreated(newBatchId, params.sscc, params.producerId, 0);
        return newBatchId;
    }

    function approveBatch(uint256 _batchId, bool _isApproved) public whenNotPaused onlyApprover {
        require(_batches[_batchId].batchId != 0, "Batch does not exist");
        require(_batches[_batchId].status == BatchStatus.PendingApproval, "Batch is not pending approval");

        uint256 approverId = uint256(uint160(msg.sender));
        uint256 producerId = _batches[_batchId].producerId;
        
        require(_userRegion[approverId] == _userRegion[producerId], "Approver must be in the same region as the producer");

        _batches[_batchId].approverId = approverId;

        if (_isApproved) {
            _batches[_batchId].status = BatchStatus.Approved;
        } else {
            _batches[_batchId].status = BatchStatus.Rejected;
        }

        string memory action = _isApproved ? "Approved Batch" : "Rejected Batch";
        _logSystemActivity(approverId, action, _batchId);

        emit NewSystemActivity(approverId, action, _batchId);
    }

    function updateBatchStatus(uint256 _batchId, BatchStatus _newStatus) 
        public 
        whenNotPaused 
        onlyApprover
    {
        require(_batchId <= _batchIdCounter, "Batch does not exist");
        require(_batches[_batchId].status == BatchStatus.PendingApproval, "Can only update status of pending batches");

        _batches[_batchId].status = _newStatus;
        emit NewSystemActivity(uint256(uint160(msg.sender)), "Updated Batch Status", _batchId);
    }

    function updateBatchImages(
        uint256 _batchId, 
        string memory _newProductImageUrl, 
        string memory _newCertificateImageUrl,
        uint256 _producerId
    ) 
        public 
        whenNotPaused 
    {
        require(_batchId <= _batchIdCounter, "Batch does not exist");
        require(_batches[_batchId].status == BatchStatus.PendingApproval, "Can only update images of pending batches");
        require(_batches[_batchId].producerId == _producerId, "Not authorized to update this batch");

        _batches[_batchId].productImageUrl = _newProductImageUrl;
        _batches[_batchId].certificateImageUrl = _newCertificateImageUrl;

        _logSystemActivity(_producerId, "Updated Batch Images", _batchId);

        emit NewSystemActivity(_producerId, "Updated Batch Images", _batchId);
    }

    function getBatchInfo(uint256 _batchId) public view returns (Batch memory) {
        require(_batchId <= _batchIdCounter, "Batch does not exist");
        return _batches[_batchId];
    }

    function getBatchIdBySSCC(string memory _sscc) public view returns (uint256) {
        return _ssccToBatchId[_sscc];
    }

    function addProducer(uint256 producer) public onlyAdmin {
        _producers[producer] = true;
    }

    function addApprover(uint256 approver) public onlyAdmin {
        _approvers[approver] = true;
    }

    function pause() public onlyAdmin {
        _paused = true;
    }

    function unpause() public onlyAdmin {
        _paused = false;
    }

    function _calculateDataHash(
        string memory _sscc,
        uint256 _producerId,
        uint256 _approverId,
        string memory _quantity,
        uint256 _productionDate,
        uint256 _expiryDate,
        string memory _farmPlotNumber,
        uint256 _productId
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(_sscc, _producerId, _approverId, _quantity, _productionDate, _expiryDate, _farmPlotNumber, _productId));
    }

    function calculateDataHash(
        string memory _sscc,
        uint256 _producerId,
        uint256 _approverId,
        string memory _quantity,
        uint256 _productionDate,
        uint256 _expiryDate,
        string memory _farmPlotNumber,
        uint256 _productId
    ) private pure returns (bytes32) {
        return _calculateDataHash(_sscc, _producerId, _approverId, _quantity, _productionDate, _expiryDate, _farmPlotNumber, _productId);
    }

    function _logSystemActivity(uint256 userId, string memory action, uint256 batchId) private {
        SystemActivity memory newActivity = SystemActivity({
            timestamp: block.timestamp,
            action: action,
            batchId: batchId,
            userId: userId
        });
        _systemActivities[userId].push(newActivity);
        emit NewSystemActivity(userId, action, batchId);
    }

    function _logUserActivity(uint256 userId, string memory action, uint256 batchId, string memory details, string memory imageHash) private {
        UserActivity memory newActivity = UserActivity({
            timestamp: block.timestamp,
            action: action,
            batchId: batchId,
            details: details,
            imageHash: imageHash,
            userId: userId
        });
        _userActivities[userId].push(newActivity);
        emit NewUserActivity(userId, action, batchId, details, imageHash);
    }

    function getSystemActivities(uint256 userId) public view returns (SystemActivity[] memory) {
        return _systemActivities[userId];
    }

    function getUserActivities(uint256 userId) public view returns (UserActivity[] memory) {
        return _userActivities[userId];
    }

    function addProducerActivity(uint256 _batchId, string memory _action, string memory _details, string memory _imageHash) public whenNotPaused {
        require(_batches[_batchId].batchId != 0, "Batch does not exist");
        uint256 producerId = _batches[_batchId].producerId;
        require(producerId == uint256(uint160(msg.sender)), "Not authorized to add activity for this batch");
        
        _logUserActivity(producerId, _action, _batchId, _details, _imageHash);
    }

    function getAdmin() public view returns (uint256) {
        return _admin;
    }

    function getPendingBatches() public view onlyApprover returns (uint256[] memory) {
        uint256[] memory pendingBatches = new uint256[](_batchIdCounter);
        uint256 count = 0;
        uint256 approverRegion = _userRegion[uint256(uint160(msg.sender))];
        
        for (uint256 i = 1; i <= _batchIdCounter; i++) {
            if (_batches[i].status == BatchStatus.PendingApproval && 
                _userRegion[_batches[i].producerId] == approverRegion) {
                pendingBatches[count] = i;
                count++;
            }
        }
        
        assembly {
            mstore(pendingBatches, count)
        }
        
        return pendingBatches;
    }

    mapping(uint256 => uint256) private _userRegion;
    mapping(uint256 => uint256[]) private _regionApprovers;

    function setUserRegion(uint256 userId, uint256 regionId) public onlyAdmin {
        _userRegion[userId] = regionId;
    }

    function addApproverToRegion(uint256 approverId, uint256 regionId) public onlyAdmin {
        require(_approvers[approverId], "User is not an approver");
        _userRegion[approverId] = regionId;
        _regionApprovers[regionId].push(approverId);
    }

    function getRegionApprovers(uint256 regionId) public view returns (uint256[] memory) {
        return _regionApprovers[regionId];
    }

    function updateBatchDates(
        uint256 _batchId, 
        uint256 _newStartDate, 
        uint256 _newEndDate,
        uint256 _producerId
    ) public whenNotPaused {
        require(_batchId <= _batchIdCounter, "Batch does not exist");
        require(_batches[_batchId].status == BatchStatus.PendingApproval, "Can only update dates of pending batches");
        require(_batches[_batchId].producerId == _producerId, "Not authorized to update this batch");
        require(_newStartDate > 0, "Start date is required");
        require(_newEndDate > 0, "End date is required");
        require(_newStartDate < _newEndDate, "Start date must be before end date");

        _batches[_batchId].startDate = _newStartDate;
        _batches[_batchId].endDate = _newEndDate;

        _logSystemActivity(_producerId, "Updated Batch Dates", _batchId);

        emit NewSystemActivity(_producerId, "Updated Batch Dates", _batchId);
    }
}