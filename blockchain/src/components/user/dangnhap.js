const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
//const mysql = require('mysql2/promise');
const { sendEmail } = require('./sendmail');

const router = express.Router();

module.exports = function(db) {
    router.get('/dangnhap', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/account/dangnhap.html'));
    });

    router.post('/dangnhap', async function(req, res) {
        const { email, password, isAdmin } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
        }

        try {
            if (isAdmin) {
                const adminQuery = 'SELECT * FROM admin WHERE admin_email = ?';
                const [admins] = await db.query(adminQuery, [email]);
                const admin = admins[0];

                if (!admin) {
                    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
                }
                const isPasswordValid = await bcrypt.compare(password, admin.admin_pass);

                if (!isPasswordValid) {
                    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
                }

 // Giả sử có trường admin_id
           //     req.session.isAdmin = true;
   

                // Tạo session cho admin
                req.session.adminId = admin.id;
                req.session.adminEmail = admin.admin_email;
                req.session.adminName = admin.admin_name; 
                req.session.province_id = admin.province_id; // Lưu province_id vào session


                // Trả về thông tin admin
                res.status(200).json({ 
                    message: 'Đăng nhập thành công', 
                    admin: {
                        adminId: admin.id,
                        adminEmail: admin.admin_email,
                        adminName: admin.admin_name,
                        province_id: admin.province_id,
                        roleId: 3 // Giả sử tất cả admin đều có roleId là 3
                    }
                });
            } else {
                const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
                const user = users[0];

                if (!user) {
                    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
                }
                if (!user.passwd) {
                    return res.status(500).json({ message: 'Internal server error', error: 'Mật khẩu không đúng' });
                }

                const isPasswordValid = await bcrypt.compare(password, user.passwd);

                if (!isPasswordValid) {
                    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
                }

                if (!user.is_approved) {
                    return res.status(403).json({ message: 'Tài khoản của bạn chưa xác thực, vui lòng xác thực Email trước khi đăng nhập.' });
                }

                if (isAdmin && user.role_id !== 3) { // Giả sử role_id 3 là Admin
                    return res.status(403).json({ message: 'Bạn không có quyền đăng nhập với tư cách Admin' });
                }

                // Thiết lập session cho user
                req.session.userId = user.uid;
                req.session.isAdmin = false;
                req.session.name = user.name;
                req.session.email = user.email;
                req.session.roleId = user.role_id;
                req.session.province_id = user.province_id; // Lưu province_id vào session
                req.session.region_id = user.region_id; // Lưu region_id vào session
                req.session.region = user.region; // Lưu region vào session


                
                // Trả về thông tin người dùng và role_id
                res.status(200).json({ 
                    message: 'Đăng nhập thành công', 
                    user: {
                        uid: user.uid,
                        name: user.name,
                        email: user.email,
                        roleId: user.role_id,
                        province_id: user.province_id,
                        region_id: user.region_id,
                        region: user.region
                    }
                });
            }

        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    });

    // Thêm route để phục vụ trang quenmatkhau.html
    router.get('/quenmatkhau', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/account/quenmatkhau.html'));
    });

    // Tạo biến toàn cục để lưu trữ mật khẩu mới
    let globalNewPassword = '';

    // Thêm route để xử lý yêu cầu đặt lại mật khẩu
    router.post('/reset-passwd', async function(req, res) {
        const { email, newPassword, captcha } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if(!user) {
            return res.status(400).json({ message: 'Email không tồn tại' });
        }
    
        if(!user.is_approved) {
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
            const templatePath = path.join(__dirname, '../../public/account/xacthuc.html');
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

    router.get('/admin-info', (req, res) => {
        if (req.session.adminName) {
            res.json({ adminName: req.session.adminName });
        } else {
            res.status(401).json({ message: 'Chưa đăng nhập' });
        }
    });

    router.get('/user-info', async (req, res) => {
      //  console.log('Session trong /api/user-info:', req.session);
        if (req.session.userId && req.session.userId !== 0) {
            try {
                let region = null;
                if (req.session.region_id) {
                    const [regions] = await db.query('SELECT region_name FROM regions WHERE region_id = ?', [req.session.region_id]);
                    region = regions[0] ? regions[0].region_name : null;
                }
        
                res.json({
                    userId: req.session.userId,
                    name: req.session.name,
                    email: req.session.email,
                    roleId: req.session.roleId,
                    isAdmin: req.session.isAdmin,
                    province_id: req.session.province_id,
                    region_id: req.session.region_id,
                    region: region
                });
            } catch (error) {
                console.error('Lỗi khi lấy thông tin region:', error);
                res.status(500).json({ message: 'Lỗi server' });
            }
        } else {
            console.log('No valid userId in session');
            res.status(401).json({ message: 'Chưa đăng nhập hoặc session không hợp lệ' });
        }
    });

    return router;
};