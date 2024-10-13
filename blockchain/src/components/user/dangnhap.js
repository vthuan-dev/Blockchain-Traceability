const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
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

                req.session.adminId = admin.id;
                req.session.adminEmail = admin.admin_email;
                req.session.adminName = admin.admin_name; 
                req.session.province_id = admin.province_id;
                req.session.roleId = 3;
                req.session.role = 'Admin';
                req.session.isLoggedIn = true; // Khi đăng nhập thành công

                res.status(200).json({ 
                    message: 'Đăng nhập thành công', 
                    admin: {
                        adminId: admin.id,
                        adminEmail: admin.admin_email,
                        adminName: admin.admin_name,
                        province_id: admin.province_id,
                        roleId: 3
                    }
                });
            } else {
                const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
                const user = users[0];
                const [regions] = await db.query('SELECT * FROM regions WHERE region_id = ?', [user.region_id])

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

                if (isAdmin && user.role_id !== 3) {
                    return res.status(403).json({ message: 'Bạn không có quyền đăng nhập với tư cách Admin' });
                }

                req.session.userId = user.uid;
                req.session.isAdmin = false;
                req.session.name = user.name;
                req.session.phone = user.phone;
                req.session.email = user.email;
                req.session.roleId = user.role_id;
                req.session.address = user.address;
                req.session.dob = user.dob;
                req.session.gender = user.gender;
                req.session.province_id = user.province_id;
                req.session.district_id = user.district_id;
                req.session.ward_id = user.ward_id;
                req.session.region_id = user.region_id;
                req.session.region = regions[0].region_name;
                req.session.avatar = user.avatar;
                req.session.isLoggedIn = true; // Khi đăng nhập thành công

                res.status(200).json({ 
                    message: 'Đăng nhập thành công', 
                    user: {
                        uid: user.uid,
                        name: user.name,
                        email: user.email,
                        roleId: user.role_id,
                        phone: user.phone,
                        address: user.address,
                        dob: user.dob,
                        gender: user.gender,
                        province_id: user.province_id,
                        district_id: user.district_id,
                        ward_id: user.ward_id,
                        region_id: user.region_id,
                        region: regions[0].region_name,
                        avatar: user.avatar
                    }
                });
            }

        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    });

    router.get('/quenmatkhau', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/account/quenmatkhau.html'));
    });

    let globalNewPassword = '';

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
            const [tokenResult] = await db.query('SELECT verificationToken FROM users WHERE email = ?', [email]);
            const token = tokenResult[0].verificationToken;
            
            if (!token) {
                return res.status(500).json({ message: 'Lỗi khi lấy token' });
            }

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
            const [users] = await db.query('SELECT * FROM users WHERE verificationToken = ?', [token]);
            const user = users[0];

            if (!user) {
                return res.status(400).send('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
            }

            const hashedPassword = await bcrypt.hash(globalNewPassword, 10);

            await db.query('UPDATE users SET passwd = ? WHERE verificationToken = ?', [hashedPassword, token]);

            res.redirect('/dangnhap.html');
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
        console.log('Session trong /api/user-info:', req.session);
        if (req.session && req.session.isLoggedIn) {
            try {
                // Lấy danh sách tất cả tỉnh, huyện, xã
                const [provinces] = await db.query('SELECT * FROM provinces where province_id = ?', [req.session.province_id]);
                const [districts] = await db.query('SELECT * FROM districts where district_id = ?', [req.session.district_id]);
                const [wards] = await db.query('SELECT * FROM wards where ward_id = ?', [req.session.ward_id]);

                if (req.session.adminId) {
                    // Trả về thông tin admin nếu có adminId trong session
                    res.json({
                        userId: req.session.adminId,
                        name: req.session.adminName,
                        email: req.session.adminEmail,
                        roleId: req.session.roleId,
                        isAdmin: true,
                        province_id: req.session.province_id
                    });
                } else if (req.session.userId && req.session.userId !== 0) {
                    // Trả về thông tin user nếu có userId trong session
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
                        phone: req.session.phone,
                        address: req.session.address,
                        dob: req.session.dob,
                        gender: req.session.gender,
                        isAdmin: false,
                        province: provinces[0].province_name,
                        district: districts[0].district_name,
                        ward: wards[0].ward_name,
                        region_id: req.session.region_id,
                        region: req.session.region,
                        avatar: req.session.avatar
                    });
                } else {
                    res.status(400).json({ error: 'Trạng thái đăng nhập không hợp lệ' });
                }
            } catch (error) {
                console.error('Lỗi khi lấy thông tin:', error);
                res.status(500).json({ message: 'Lỗi server' });
            }
        } else {
            // Trả về thông tin người dùng ẩn danh nếu không đăng nhập
            res.json({
                name: "Người dùng ẩn danh",
                roleId: 0,
                isAdmin: false
            });
        }
    });

    return router;
};