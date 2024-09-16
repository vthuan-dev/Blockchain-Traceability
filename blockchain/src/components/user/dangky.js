    require('dotenv').config();
    const express = require('express');
    const mysql = require('mysql2/promise');
    const path = require('path');
    const bcrypt = require('bcrypt');
    const multer = require('multer');
    const crypto = require('crypto');
    const { sendEmail } = require('./sendmail');
    const axios = require('axios');

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
        const requiredFields = ['name', 'email', 'password', 'phone', 'dob', 'gender', 'role_id', 'province_id', 'district_id', 'ward_id', 'specific_address'];
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

       
    router.get('/wards/:districtCode', async (req, res) => {
        try {
            console.log('Đang xử lý yêu cầu wards cho quận/huyện:', req.params.districtCode);
            const response = await axios.get(`https://provinces.open-api.vn/api/d/${req.params.districtCode}?depth=2`);
            const wards = response.data.wards.map(w => ({ ward_id: w.code, ward_name: w.name }));
            console.log('Kết quả API wards:', wards);
            res.json(wards);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách xã/phường:', error);
            res.status(500).json({ error: 'Lỗi khi lấy danh sách xã/phường' });
        }
    });

        router.get('/districts/:provinceCode', async (req, res) => {
            try {
                console.log('Đang gọi API districts cho tỉnh:', req.params.provinceCode);
                const response = await axios.get(`https://provinces.open-api.vn/api/p/${req.params.provinceCode}?depth=2`);
                const districts = response.data.districts.map(d => ({ district_id: d.code, district_name: d.name }));
                console.log('Kết quả API districts:', districts);
                res.json(districts);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách quận/huyện:', error);
                res.status(500).json({ error: 'Lỗi khi lấy danh sách quận/huyện' });
            }
        });
        router.get('/api/wards/:districtCode', async (req, res) => {
            try {
                console.log('Đang xử lý yêu cầu wards cho quận/huyện:', req.params.districtCode);
                const response = await axios.get(`https://provinces.open-api.vn/api/d/${req.params.districtCode}?depth=2`);
                const wards = response.data.wards.map(w => ({ ward_id: w.code, ward_name: w.name }));
                console.log('Kết quả API wards:', wards);
                res.json(wards);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách xã/phường:', error);
                res.status(500).json({ error: 'Lỗi khi lấy danh sách xã/phường' });
            }
        });
        router.get('/regions', async (req, res) => {
            try {
                console.log('Đang truy vấn regions...');
                const [regions] = await db.query('SELECT * FROM regions');
                console.log('Kết quả truy vấn regions:', regions);
                res.json(regions);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách vùng sản xuất:', error);
                res.status(500).json({ error: 'Lỗi khi lấy danh sách vùng sản xuất' });
            }
        });
        router.get('/provinces', async (req, res) => {
            try {
                console.log('Đang gọi API provinces...');
                const response = await axios.get('https://provinces.open-api.vn/api/p/');
                const provinces = response.data.map(p => ({ province_id: p.code, province_name: p.name }));
                console.log('Kết quả API provinces:', provinces);
                res.json(provinces);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách tỉnh/thành phố:', error);
                res.status(500).json({ error: 'Lỗi khi lấy danh sách tỉnh/thành phố' });
            }
        });
        router.post('/register', upload.single('avatar'), async function(req, res) {
            try {
                const { name, email, password, phone, dob, gender, role_id, region_id, province_id, district_id, ward_id, specific_address } = req.body;
                const missingFields = validateInput(req.body);

                if (missingFields.length > 0) {
                    return res.status(400).json({ message: `Yêu cầu nhập đúng dữ liệu đầu vào. Missing: ${missingFields.join(', ')}` });
                }

                // Kiểm tra và xử lý region_id
                let finalRegionId = null;
                if (region_id && region_id !== '') {
                    if (!await recordExists('SELECT * FROM regions WHERE region_id = ?', [region_id])) {
                        return res.status(400).json({ message: 'ID vùng sản xuất không hợp lệ' });
                    }
                    finalRegionId = region_id;
                }

                // Lấy thông tin địa chỉ đầy đủ
                const provinceResponse = await axios.get(`https://provinces.open-api.vn/api/p/${province_id}`);
                const districtResponse = await axios.get(`https://provinces.open-api.vn/api/d/${district_id}`);
                const wardResponse = await axios.get(`https://provinces.open-api.vn/api/w/${ward_id}`);

                const fullAddress = `${specific_address}, ${wardResponse.data.name}, ${districtResponse.data.name}, ${provinceResponse.data.name}`;

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
                const avatar = req.file ? req.file.filename : null;
                const verificationToken = crypto.randomBytes(20).toString('hex');
        
                const sql = 'INSERT INTO users (name, email, passwd, phone, address, dob, gender, role_id, region_id, province_id, district_id, ward_id, avatar, verificationToken) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                const values = [name, email, hashedPassword, phone, fullAddress, dob, gender, role_id, finalRegionId, province_id, district_id, ward_id, avatar, verificationToken];
        
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
        router.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ error: 'Đã xảy ra lỗi server' });
        });

        console.log('Các route đã đăng ký trong dangky.js:', router.stack.map(layer => layer.route?.path).filter(Boolean));

        return router;
    };
