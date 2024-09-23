// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ActivityLog {
    struct ActivityLogEntry {
        uint256 timestamp;
        uint256 uid;
        string activityName;
        string description;
        bool isSystemGenerated;
        string[] imageUrls;
        uint256[] relatedProductIds;
    }

    mapping(uint256 => ActivityLogEntry[]) private _activityLogs;

    event ActivityLogAdded(
        uint256 indexed uid,
        string activityName,
        string description,
        bool isSystemGenerated,
        string[] imageUrls,
        uint256[] relatedProductIds
    );

    function addActivityLog(

        uint256 _uid,
        string memory _activityName,
        string memory _description,
        bool _isSystemGenerated,
        string[] memory _imageUrls,
        uint256[] memory _relatedProductIds
    ) public {
        ActivityLogEntry memory newLog = ActivityLogEntry({
            timestamp: block.timestamp,
            uid: _uid,
            activityName: _activityName,
            description: _description,
            isSystemGenerated: _isSystemGenerated,
            imageUrls: _imageUrls,
            relatedProductIds: _relatedProductIds
        });

        _activityLogs[_uid].push(newLog);

        emit ActivityLogAdded(_uid, _activityName, _description, _isSystemGenerated, _imageUrls, _relatedProductIds);
    }

    function getActivityLogs(uint256 _uid) public view returns (ActivityLogEntry[] memory) {
        return _activityLogs[_uid];
    }

    function getActivityLogCount(uint256 _uid) public view returns (uint256) {
        return _activityLogs[_uid].length;
    }
 
    function getProducerActivityLogs(uint256 _uid) public view returns (ActivityLogEntry[] memory) {
        return _activityLogs[_uid];
    }

}