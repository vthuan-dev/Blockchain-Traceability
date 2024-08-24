    const express = require('express');
    const router = express.Router();
    const db = require('../../config/db');
    const path = require('path'); // Thêm module path để xử lý đường dẫn
    const bcrypt = require('bcrypt'); // Thêm module bcrypt để mã hóa mật khẩu
    const multer = require('multer'); // Để xử lý việc tải lên file


    // Khai báo biến storage để lưu trữ file tải lên
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '../../public/uploads/avatars')); // Thư mục để lưu trữ file tải lên
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + path.extname(file.originalname)); // Tên file duy nhất
        }
    });
    const upload = multer({ storage: storage }); // Khởi tạo biến upload để sử dụng multer



    function validateInput(data) {
        const requiredFields = ['name', 'email', 'password', 'phone', 'address', 'dob', 'gender', 'role_id', 'region_id'];
        //trả về các trường bắt buộc mà không có dữ liệu, nếu có dữ liệu thì trả về mảng rỗng
        return requiredFields.filter(field => !data[field]);
    }
    //kiểm tra xem dữ liệu ở db có tồn tại k 
    async function recordExists(query, params) {
        const [result] = await db.query(query, params);
        return result.length > 0;
    }
    router.get('/dangky', function(req, res) {
        res.sendFile(path.join(__dirname, '../../public/dangky.html'));
    });

    //router.post() để xử lý yêu cầu POST
    router.post('/register', upload.single('avatar'), async function(req, res) {
        const { name, email, password, phone, address, dob, gender, role_id, region_id } = req.body;
        const missingFields = validateInput(req.body);

        if (missingFields.length > 0) {
            return res.status(400).json({ message: `yêu cầu nhập đúng dữ liệu đầu vào. Missing: ${missingFields.join(', ')}` });
        }

        try {
            if (await recordExists('SELECT * FROM users WHERE email = ?', [email])) {
                return res.status(400).json({ message: 'Email đã tồn tại' });
            }

            if (await recordExists('SELECT * FROM users WHERE phone = ?', [phone])) {
                return res.status(400).json({ message: 'Phone number đã tồn tại' });
            }

            if (!await recordExists('SELECT * FROM regions WHERE region_id = ?', [region_id])) {
                return res.status(400).json({ message: 'ID vùng sản xuất không hợp lệ' });
            }

            if (!await recordExists('SELECT * FROM roles WHERE role_id = ?', [role_id])) {
                return res.status(400).json({ message: 'Nhập sai id quyền hạn rồi ' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const avatar = req.file ? req.file.path : null;

            await db.query(
                'INSERT INTO users (name, email, passwd, phone, address, dob, gender, role_id, region_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                [name, email, hashedPassword, phone, address, dob, gender, role_id, region_id, avatar]
            );

            res.status(201).json({ message: 'Đã đăng ký tài khoản người dùng thành công' });
        } catch (error) {
            console.error('Lỗi khi đăng ký :', error); 
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    });
    router.get('/regions', async function(req, res) {
        try {
            const [regions] = await db.query('SELECT region_id, region_name FROM regions');
            res.json(regions);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách vùng sản xuất:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    });

    module.exports = router;