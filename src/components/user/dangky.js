const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const bcrypt = require('bcrypt'); // For password hashing

// Function to validate input data
function validateInput(data) {
    const { name, email, password, phone, address, dob, gender, role_id, region_id } = data;
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!phone) missingFields.push('phone');
    if (!address) missingFields.push('address');
    if (!dob) missingFields.push('dob');
    if (!gender) missingFields.push('gender');
    if (!role_id) missingFields.push('role_id');
    if (!region_id) missingFields.push('region_id');
    return missingFields;
}

// Function to check if a record exists in the database
async function recordExists(query, params) {
    const [result] = await db.query(query, params);
    return result.length > 0;
}

// Endpoint to handle user registration
router.post('/register', async function(req, res) {
    const { name, email, password, phone, address, dob, gender, role_id, region_id } = req.body;

    console.log(req.body); // Log dữ liệu nhận được

    // Log chi tiết từng trường
    console.log('name:', name);
    console.log('email:', email);
    console.log('password:', password);
    console.log('phone:', phone);
    console.log('address:', address);
    console.log('dob:', dob);
    console.log('gender:', gender);
    console.log('role_id:', role_id);
    console.log('region_id:', region_id);

    const missingFields = validateInput(req.body);
    if (missingFields.length > 0) {
        return res.status(400).json({ message: `All fields are required. Missing: ${missingFields.join(', ')}` });
    }

    try {
        if (await recordExists('SELECT * FROM users WHERE email = ?', [email])) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        if (await recordExists('SELECT * FROM users WHERE phone = ?', [phone])) {
            return res.status(400).json({ message: 'Phone number already exists' });
        }

        if (!await recordExists('SELECT * FROM regions WHERE region_id = ?', [region_id])) {
            return res.status(400).json({ message: 'Invalid region' });
        }

        if (!await recordExists('SELECT * FROM roles WHERE role_id = ?', [role_id])) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO users (name, email, passwd, phone, address, dob, gender, role_id, region_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [name, email, hashedPassword, phone, address, dob, gender, role_id, region_id]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error during user registration:', error); // Log the error details
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;