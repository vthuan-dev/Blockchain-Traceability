    require('dotenv').config();
    const express = require('express');
    const mysql = require('mysql2/promise');
    const path = require('path');
    const bcrypt = require('bcrypt');
    const multer = require('multer');
    const crypto = require('crypto');
    const { sendEmail } = require('./sendmail');

    const router = express.Router();

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '../../public/uploads/avatars'));
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + path.extname(file.originalname));
        }
    });
    const upload = multer({ storage: storage });

    function validateInput(data) {
        const requiredFields = ['name', 'email', 'password', 'phone', 'address', 'dob', 'gender', 'role_id', 'region_id'];
        return requiredFields.filter(field => !data[field]);
    }

    module.exports = function(db) {
        router.get('/dangky', function(req, res) {
            res.sendFile(path.join(__dirname, '../../public/account/dangky.html'));
        });
        
        async function recordExists(query, param) {
            try {
                const [rows] = await db.query(query, param);
                return rows.length > 0;
            } catch (error) {
                if (error.code === 'ECONNRESET') {
                    console.error('Connection was reset. Retrying...');
                    // Retry logic or handle the error appropriately
                } else {
                    throw error;
                }
            }
        }

        router.get('/regions', async (req, res) => {
            const query = 'SELECT * FROM regions';
            try {
                const [results] = await db.query(query);
                res.json(results);
            } catch (err) {
                res.status(500).json({ error: 'Lỗi khi lấy danh sách vùng sản xuất' });
            }
        });



        // Đăng ký tài khoản người dùng , nếu đăng ký thành công sẽ gửi email xác thực
        // còn về vận chuyển và nhà kho thì sẽ k cần vùng sản xuất và xác thực
        router.post('/register', upload.single('avatar'), async function(req, res) {
            const { name, email, password, phone, address, dob, gender, role_id } = req.body;
            const region_id = req.body.region_id || null;
            const missingFields = validateInput(req.body);
        
            if (missingFields.length > 0) {
                return res.status(400).json({ message: `Yêu cầu nhập đúng dữ liệu đầu vào. Missing: ${missingFields.join(', ')}` });
            }
        
            // Giả sử role_id cho người sản xuất là 1 và kiểm định là 2
            const requireRegionRoles = ['1', '2'];
            if (requireRegionRoles.includes(role_id) && !region_id) {
                return res.status(400).json({ message: 'Vùng sản xuất là bắt buộc đối với người sản xuất và kiểm định' });
            }
        
            try {
                if (await recordExists('SELECT * FROM users WHERE email = ?', [email])) {
                    return res.status(400).json({ message: 'Email đã tồn tại' });
                }
        
                if (await recordExists('SELECT * FROM users WHERE phone = ?', [phone])) {
                    return res.status(400).json({ message: 'Số điện thoại đã tồn tại' });
                }
        
                if (region_id && !await recordExists('SELECT * FROM regions WHERE region_id = ?', [region_id])) {
                    return res.status(400).json({ message: 'ID vùng sản xuất không hợp lệ' });
                }
        
                if (!await recordExists('SELECT * FROM roles WHERE role_id = ?', [role_id])) {
                    return res.status(400).json({ message: 'ID quyền hạn không hợp lệ' });
                }
        
                const hashedPassword = await bcrypt.hash(password, 10);
                const avatar = req.file ? req.file.path : null;
                const verificationToken = crypto.randomBytes(20).toString('hex');
        
                let sql, values;
                if (requireRegionRoles.includes(role_id)) {
                    sql = 'INSERT INTO users (name, email, passwd, phone, address, dob, gender, role_id, region_id, avatar, verificationToken) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    values = [name, email, hashedPassword, phone, address, dob, gender, role_id, region_id, avatar, verificationToken];
                } else {
                    sql = 'INSERT INTO users (name, email, passwd, phone, address, dob, gender, role_id, avatar, verificationToken) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    values = [name, email, hashedPassword, phone, address, dob, gender, role_id, avatar, verificationToken];
                }
        
                await db.query(sql, values);
        
                // Gửi email xác thực
                const verificationLink = `http://localhost:3000/api/verify/${verificationToken}`;
                const templatePath = path.join(__dirname, '../../public/account/xacthuc.html');
                await sendEmail(email, name, verificationLink, 'Xác thực tài khoản của bạn', templatePath);
        
                res.status(201).json({ 
                    message: 'Đã đăng ký tài khoản người dùng thành công. Vui lòng kiểm tra email của bạn để xác thực tài khoản.',
                    email: email
                });
            } catch (error) {
                console.error('Lỗi khi đăng ký:', error); 
                res.status(500).json({ message: 'Internal server error', error: error.message });
            }
        });

        router.get(['/api/verify/:token', '/verify/:token'], async function(req, res) {
            const { token } = req.params;
            try {
                const [result] = await db.query('UPDATE users SET is_approved = true WHERE verificationToken = ?', [token]);
                if (result.affectedRows > 0) {
                    res.redirect('/api/dangnhap'); // Chuyển hướng đến trang đăng nhập
                } else {
                    res.status(400).send('Token xác thực không hợp lệ hoặc đã hết hạn.');
                }
            } catch (error) {
                console.error('Lỗi khi xác thực:', error);
                res.status(500).send('Đã xảy ra lỗi khi xác thực tài khoản.');
            }
        });

        return router;
    };
