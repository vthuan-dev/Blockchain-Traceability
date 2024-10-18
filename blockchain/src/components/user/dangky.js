    require('dotenv').config();
    const express = require('express');
    const mysql = require('mysql2/promise');
    const fs = require('fs').promises;
    const path = require('path');
    const bcrypt = require('bcrypt');
    const multer = require('multer');
    const crypto = require('crypto');
    const { sendEmail } = require('./sendmail');
    const axios = require('axios');
    const { storage, ref, uploadBytes, getDownloadURL, authenticateAnonymously } = require('../../firebase');
    const { saveNotification } = require('../../notification');

    const router = express.Router();
    
    // Sử dụng memoryStorage thay vì diskStorage
    const upload = multer({ storage: multer.memoryStorage() });

    function validateInput(data) {
        const requiredFields = ['name', 'email', 'password', 'phone', 'dob', 'gender', 'role_id', 'province_id', 'district_id', 'ward_id', 'specific_address'];
        // Chỉ yêu cầu region_id cho vai trò người sản xuất và kiểm định
        if (data.role_id === '1' || data.role_id === '2') {
            requiredFields.push('region_id');
        }
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
        
        async function emailExists(email) {
            try {
                const [userRows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
                const [adminRows] = await db.query('SELECT * FROM admin WHERE admin_email = ?', [email]);
                return userRows.length > 0 || adminRows.length > 0;
            } catch (error) {
                console.error('Lỗi khi kiểm tra email:', error);
                throw error;
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
                const provinceId = req.query.province_id;
                
                if (!provinceId) {
                    return res.status(400).json({ error: 'Thiếu mã tỉnh' });
                }
        
                console.log('Đang truy vấn regions cho tỉnh:', provinceId);
                
                // Sửa đổi câu truy vấn để chỉ lấy các vùng có 2 chữ số đầu của region_id trùng với provinceId
                const [regions] = await db.query('SELECT * FROM regions WHERE LEFT(region_id, 2) = ?', [provinceId.substring(0, 2)]);
                
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
                const response = await axios.get('https://provinces.open-api.vn/api/p/', { timeout: 20000 }); // Tăng thời gian timeout lên 20 giây
                const provinces = response.data.map(p => ({ province_id: p.code, province_name: p.name }));
                console.log('Kết quả API provinces:', provinces);
                await fs.writeFile(path.join(__dirname, 'provinces_data.json'), JSON.stringify(provinces));
                res.json(provinces);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách tỉnh/thành phố từ API:', error);
        
                // Kiểm tra sự tồn tại của file dự phòng trước khi đọc
                const filePath = path.join(__dirname, 'provinces_data.json');
                try {
                    await fs.access(filePath); // Kiểm tra xem file có tồn tại không
                    const data = await fs.readFile(filePath, 'utf8');
                    const provinces = JSON.parse(data);
                    console.log('Sử dụng dữ liệu dự phòng từ file');
                    res.json(provinces);
                } catch (fileError) {
                    console.error('Lỗi khi đọc file dự phòng:', fileError);
                    res.status(500).json({ error: 'Không thể lấy danh sách tỉnh/thành phố' });
                }
            }
        });
        
        router.post('/register', upload.single('avatar'), async function(req, res) {
            try {
                await authenticateAnonymously();

                const { name, email, password, phone, dob, gender, role_id, region_id, province_id, district_id, ward_id, specific_address } = req.body;
                const missingFields = validateInput(req.body);

                if (missingFields.length > 0) {
                    return res.status(400).json({ message: `Yêu cầu nhập đúng dữ liệu đầu vào. Missing: ${missingFields.join(', ')}` });
                }

                // Kiểm tra và thêm tỉnh nếu chưa tồn tại
                let [provinceExists] = await db.query('SELECT province_name FROM provinces WHERE province_id = ?', [province_id]);
                if (provinceExists.length === 0) {
                    const provinceResponse = await axios.get(`https://provinces.open-api.vn/api/p/${province_id}`);
                    const [result] = await db.query('INSERT INTO provinces (province_id, province_name) VALUES (?, ?)', [province_id, provinceResponse.data.name]);
                    provinceExists = [{ province_name: provinceResponse.data.name }];
                }

                // Kiểm tra và thêm huyện nếu chưa tồn tại
                let [districtExists] = await db.query('SELECT district_name FROM districts WHERE district_id = ?', [district_id]);
                if (districtExists.length === 0) {
                    const districtResponse = await axios.get(`https://provinces.open-api.vn/api/d/${district_id}`);
                    await db.query('INSERT INTO districts (district_id, district_name, province_id) VALUES (?, ?, ?)', [district_id, districtResponse.data.name, province_id]);
                    districtExists = [{ district_name: districtResponse.data.name }];
                }

                // Kiểm tra và thêm xã nếu chưa tồn tại
                let [wardExists] = await db.query('SELECT ward_name FROM wards WHERE ward_id = ?', [ward_id]);
                if (wardExists.length === 0) {
                    const wardResponse = await axios.get(`https://provinces.open-api.vn/api/w/${ward_id}`);
                    await db.query('INSERT INTO wards (ward_id, ward_name, district_id) VALUES (?, ?, ?)', [ward_id, wardResponse.data.name, district_id]);
                    wardExists = [{ ward_name: wardResponse.data.name }];
                }

                const fullAddress = `${specific_address}, ${wardExists[0].ward_name}, ${districtExists[0].district_name}, ${provinceExists[0].province_name}`;

                // Các kiểm tra khác (email, số điện thoại, vùng sản xuất, vai trò)
                if (await emailExists(email)) {
                    return res.status(400).json({ message: 'Email đã tồn tại trong hệ thống' });
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
                let avatarUrl = null;
                if (req.file) {
                    const sanitizedFileName = req.file.originalname.replace(/\s+/g, '_').toLowerCase();
                    const avatarRef = ref(storage, `avatars/${Date.now()}_${sanitizedFileName}`);
                    const snapshot = await uploadBytes(avatarRef, req.file.buffer);
                    avatarUrl = await getDownloadURL(snapshot.ref);
                }

                const verificationToken = crypto.randomBytes(20).toString('hex');

                // Kiểm tra region_id
                let finalRegionId = null;
                if (region_id && region_id !== '') {
                    if (!await recordExists('SELECT * FROM regions WHERE region_id = ?', [region_id])) {
                        return res.status(400).json({ message: 'ID vùng sản xuất không hợp lệ' });
                    }
                    finalRegionId = region_id;
                }

                const sql = 'INSERT INTO users (name, email, passwd, phone, address, dob, gender, role_id, region_id, province_id, district_id, ward_id, avatar, verificationToken) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                const values = [name, email, hashedPassword, phone, fullAddress, dob, gender, role_id, finalRegionId, province_id, district_id, ward_id, avatarUrl, verificationToken];

                const [result] = await db.query(sql, values);
                const userId = result.insertId;

                // Gửi email xác thực
                const verificationLink = `http://localhost:3000/api/verify/${verificationToken}`;
                const templatePath = path.join(__dirname, '../../public/account/xacthuc.html');
                await sendEmail(email, name, verificationLink, 'Xác thực tài khoản của bạn', templatePath);

                // Lưu thông báo vào CSDL
                const notificationMessage = `Người dùng mới đã đăng ký: ${name} (${email})`;
                await saveNotification(db, userId, notificationMessage, 1); // 1 là ID của loại thông báo 'register'

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

      //  console.log('Các route đã đăng ký trong dangky.js:', router.stack.map(layer => layer.route?.path).filter(Boolean));

        return router;
    };

