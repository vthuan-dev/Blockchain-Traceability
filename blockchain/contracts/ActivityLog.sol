// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ActivityLog{
 struct ActivityLogEntry {
    uint256 batchId;
    uint256 participantId;
    uint256 timestamp;
    string activityName;
    string description;
    bool isSystemActivity;
    string[] imageUrls;
    uint256[] relatedProductIds;
}

    mapping(uint256 => ActivityLogEntry[]) private _activityLogs;

  event ActivityLogAdded(
    uint256 indexed batchId,
    uint256 indexed participantId,
    string activityName,
    string description,
    bool isSystemGenerated,
    string[] imageUrls,
    uint256[] relatedProductIds
);
    function addActivityLog(
        uint256 _batchId,
        uint256 _participantId,
        string memory _activityName,
        string memory _description,
        bool _isSystemActivity,  // Đổi tên tham số này
        string[] memory _imageUrls,
        uint256[] memory _relatedProductIds
    ) public {
        ActivityLogEntry memory newLog = ActivityLogEntry({
            batchId: _batchId,
            participantId: _participantId,
            timestamp: block.timestamp,
            activityName: _activityName,
            description: _description,
            isSystemActivity: _isSystemActivity,  // Và ở đây
            imageUrls: _imageUrls,
            relatedProductIds: _relatedProductIds
        });

        _activityLogs[_batchId].push(newLog);

        emit ActivityLogAdded(_batchId, _participantId, _activityName, _description, _isSystemActivity, _imageUrls, _relatedProductIds);
    }
    function getActivityLogs(uint256 _uid) public view returns (ActivityLogEntry[] memory) {
        return _activityLogs[_uid];
    }


function getProducerActivityLogs(uint256 _uid) public view returns (ActivityLogEntry[] memory) {
    ActivityLogEntry[] memory allLogs = _activityLogs[_uid];
    uint256 count = 0;
    for (uint256 i = 0; i < allLogs.length; i++) {
        if (!allLogs[i].isSystemActivity) {  // Sửa ở đây
            count++;
        }
    }

    ActivityLogEntry[] memory producerLogs = new ActivityLogEntry[](count);
    uint256 index = 0;
    for (uint256 i = 0; i < allLogs.length; i++) {
        if (!allLogs[i].isSystemActivity) {  // Và ở đây
            producerLogs[index] = allLogs[i];
            index++;
        }
    }

    return producerLogs;
}
function getSystemActivityLogs(uint256 _uid) public view returns (ActivityLogEntry[] memory) {
    ActivityLogEntry[] memory allLogs = _activityLogs[_uid];
    uint256 count = 0;
    for (uint256 i = 0; i < allLogs.length; i++) {
        if (allLogs[i].isSystemActivity) {  // Sửa ở đây
            count++;
        }
    }

    ActivityLogEntry[] memory systemLogs = new ActivityLogEntry[](count);
    uint256 index = 0;
    for (uint256 i = 0; i < allLogs.length; i++) {
        if (allLogs[i].isSystemActivity) {  // Và ở đây
            systemLogs[index] = allLogs[i];
            index++;
        }
    }

    return systemLogs;
}

    function getSystemActivityLogsBySSCC(string memory _sscc) public view returns (ActivityLogEntry[] memory) {
        uint256 batchId = uint256(keccak256(abi.encodePacked(_sscc)));
        return getSystemActivityLogs(batchId);
    }
}