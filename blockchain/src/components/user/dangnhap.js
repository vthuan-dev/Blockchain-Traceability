const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const { sendEmail } = require('./sendmail');

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
            if (error.code === 'ECONNRESET') {
                console.error('Lỗi kết nối cơ sở dữ liệu:', error);
                return res.status(500).json({ message: 'Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.' });
            }
            console.error('Lỗi khi đăng nhập:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    });

    // Thêm route để phục vụ trang quenmatkhau.html
    router.get('/quenmatkhau', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/quenmatkhau.html'));
    });

    // Tạo biến toàn cục để lưu trữ mật khẩu mới
    let globalNewPassword = '';

    // Thêm route để xử lý yêu cầu đặt lại mật khẩu
    router.post('/quenmatkhau', async function(req, res) {
        const { email, newPassword, captcha } = req.body;

        console.log('Email nhận được:', email); // Thêm dòng này để kiểm tra email nhận được

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        console.log('Kết quả truy vấn:', users); // Thêm dòng này để kiểm tra kết quả truy vấn

        try {
            if (!user) {
                return res.status(400).json({ message: 'Email không tồn tại' });
            }
    
            if (!user.is_approved) {
                return res.status(400).json({ message: 'Tài khoản chưa được phê duyệt' });
            }

            globalNewPassword = newPassword; 
            // Lấy token từ cơ sở dữ liệu dựa trên email
            const [tokenResult] = await db.query('SELECT verificationToken FROM users WHERE email = ?', [email]);
            const token = tokenResult[0].verificationToken;
            
            if (!token) {
                return res.status(500).json({ message: 'Lỗi khi lấy token' });
            }

            // Gửi email thông báo đặt lại mật khẩu
            const resetLink = `http://localhost:3000/api/reset-password/${token}`;
            const templatePath = path.join(__dirname, '../../public/xacthuc.html');
            await sendEmail(email, user.name, resetLink, 'Xác thực đặt lại mật khẩu', templatePath);
            
            res.status(200).json({ message: 'Yêu cầu đặt lại mật khẩu đã được gửi' });
        } catch (error) {
            console.error('Lỗi:', error);
            res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu' });
        }
    });

    router.get('/reset-password/:token', async function(req, res) {
        const { token } = req.params;
        try {
            // Kiểm tra token trong cơ sở dữ liệu
            const [users] = await db.query('SELECT * FROM users WHERE verificationToken = ?', [token]);
            const user = users[0];

            if (!user) {
                return res.status(400).send('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
            }

            // Hash mật khẩu mới
            const hashedPassword = await bcrypt.hash(globalNewPassword, 10); // Sử dụng chuỗi thay vì mảng

            // Cập nhật mật khẩu mới trong cơ sở dữ liệu
            await db.query('UPDATE users SET passwd = ? WHERE verificationToken = ?', [hashedPassword, token]);

            res.redirect('/dangnhap.html'); // Chuyển hướng đến trang đăng nhập
        } catch (error) {
            console.error('Lỗi khi đặt lại mật khẩu:', error);
            res.status(500).send('Đã xảy ra lỗi khi đặt lại mật khẩu.');
        }
    });

    return router;
};