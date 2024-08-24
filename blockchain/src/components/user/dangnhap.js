import express from 'express';
import bcrypt from 'bcrypt'; // For password hashing
import path from 'path'; // Import module path
import db from '../../config/db.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

// Chuyển đổi import.meta.url thành __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

router.get('/dangnhap', function(req, res) {
    res.sendFile(path.join(__dirname, '../../public/dangnhap.html'));
});

// Route xử lý đăng nhập
router.post('/dangnhap', async function(req, res) {
    const { email, password } = req.body;

    // Kiểm tra xem email và password có được cung cấp không
    if (!email || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
    }

    try {
        // Lấy thông tin người dùng từ cơ sở dữ liệu dựa trên email
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        // Nếu không tìm thấy người dùng, trả về lỗi
        if (!user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }
        if (!user.passwd) {
            return res.status(500).json({ message: 'Internal server error', error: 'Password not found in database' });
        }

        // So sánh mật khẩu người dùng nhập vào với mật khẩu đã băm
        console.log('Password from user:', password);
        console.log('Hashed password from DB:', user.passwd);
        const isPasswordValid = await bcrypt.compare(password, user.passwd);

        // Nếu mật khẩu không đúng, trả về lỗi
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        // Nếu đăng nhập thành công, trả về thông báo thành công
        res.status(200).json({ message: 'Đăng nhập thành công' });
    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

export default router;