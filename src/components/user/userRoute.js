var express = require('express');
var router = express.Router();
var db = require('../../config/db');

// router dùng để định tuyến các request đến server, /users là đường dẫn mà client sẽ gửi request đến
router.get('/users', function(req, res) {
    const query = `
        SELECT 
            users.uid, 
            users.phone, 
            users.name, 
            users.email, 
            users.address, 
            users.dob, 
            users.gender, 
            users.role_id, 
            users.is_approved, 
            users.created_at,
            regions.region_name
        FROM users
        JOIN regions ON users.region_id = regions.region_id
    `;
    
    db.query(query, function(err, results) {
        if (err) {
            res.status(500).send('Error fetching user data');
            return;
        }
        res.json(results);
    });
});

module.exports = router;