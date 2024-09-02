const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');

const router = express.Router();

module.exports = function(db) {
    router.get('/dangnhap', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/dangnhap.html'));
    });

    router.post('/dangnhap', async function(req, res) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
        }

        try {
            const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            const user = users[0];

            if (!user) {
                return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
            }
            if (!user.passwd) {
                return res.status(500).json({ message: 'Internal server error', error: 'Password not found in database' });
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwd);

            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
            }

            if (!user.is_approved) {
                return res.status(403).json({ message: 'Tài khoản của bạn chưa xác thực, vui lòng xác thực Email trước khi đăng nhập.' });
            }

            res.status(200).json({ message: 'Đăng nhập thành công' });
        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    });

    return router;
};