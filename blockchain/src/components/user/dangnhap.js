const express = require("express");
const bcrypt = require("bcryptjs");
const path = require("path");
const { sendEmail } = require("./sendmail");
const axios = require("axios");
const crypto = require("crypto");

const router = express.Router();

module.exports = function (db) {
  router.get("/dangnhap", (req, res) => {
    res.sendFile(path.join(__dirname, "../../public/account/dangnhap.html"));
  });

  router.post("/dangnhap", async function (req, res) {
    const { email, password, isAdmin } = req.body;

    console.log("Thử đăng nhập với:", { email, isAdmin });

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập email và mật khẩu" });
    }

    try {
      if (isAdmin) {
        const adminQuery = "SELECT * FROM admin WHERE admin_email = ?";
        const [admins] = await db.query(adminQuery, [email]);
        const admin = admins[0];

        if (!admin) {
          return res
            .status(401)
            .json({ message: "Email hoặc mật khẩu không đúng" });
        }
        const isPasswordValid = await bcrypt.compare(
          password,
          admin.admin_pass
        );

        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "Email hoặc mật khẩu không đúng" });
        }

        req.session.adminId = admin.id;
        req.session.adminEmail = admin.admin_email;
        req.session.adminName = admin.admin_name;
        req.session.province_id = admin.province_id;
        req.session.roleId = 3;
        req.session.role = "Admin";
        req.session.isLoggedIn = true;

        console.log("Session trước khi lưu:", req.session);

        return req.session.save((err) => {
          if (err) {
            console.error("Lỗi khi lưu session:", err);
            return res.status(500).json({ message: "Lỗi đăng nhập, vui lòng thử lại" });
          }
          
          console.log("Session sau khi lưu:", req.session);
          res.cookie('blockchain.sid', req.sessionID, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 ngày
          });
          
          console.log("Session ID đã được thiết lập:", req.sessionID);
          return res.status(200).json({
            message: "Đăng nhập thành công",
            admin: {
              adminId: admin.id,
              adminEmail: admin.admin_email,
              adminName: admin.admin_name,
              province_id: admin.province_id,
              roleId: 3,
            }
          });
        });
      } else {
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
          email,
        ]);
        const user = users[0];

        if (!user) {
          return res
            .status(401)
            .json({ message: "Email hoặc mật khẩu không đúng" });
        }

        // Kiểm tra region_id trước khi truy vấn
        let regions = [];
        if (user.region_id) {
          [regions] = await db.query(
            "SELECT * FROM regions WHERE region_id = ?",
            [user.region_id]
          );
        }

        if (!user.passwd) {
          return res
            .status(500)
            .json({
              message: "Internal server error",
              error: "Mật khẩu không đúng",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwd);

        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "Email hoặc mật khẩu không đúng" });
        }

        if (!user.is_approved) {
          return res
            .status(403)
            .json({
              message:
                "Tài khoản của bạn chưa xác thực, vui lòng xác thực Email trước khi đăng nhập.",
            });
        }

        if (isAdmin && user.role_id !== 3) {
          return res
            .status(403)
            .json({
              message: "Bạn không có quyền đăng nhập với tư cách Admin",
            });
        }

        let region = null;
        if (user.region_id && regions.length > 0) {
          region = regions[0].region_name;
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
        req.session.region = region;
        req.session.avatar = user.avatar;
        req.session.isLoggedIn = true;

        // Thêm log này sau khi set tất cả các thông tin session
        console.log("User session after login:", {
          userId: req.session.userId,
          name: req.session.name,
          email: req.session.email,
          roleId: req.session.roleId,
          isLoggedIn: req.session.isLoggedIn,
          // ... (các thông tin session khác)
        });

        return req.session.save((err) => {
          if (err) {
            console.error("Lỗi khi lưu session:", err);
            return res.status(500).json({ message: "Lỗi đăng nhập, vui lòng thử lại" });
          }
          
          console.log("Session sau khi lưu:", req.session);
          res.cookie('blockchain.sid', req.sessionID, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 ngày
          });
          
          console.log("Session ID đã được thiết lập:", req.sessionID);
          return res.status(200).json({
            message: "Đăng nhập thành công",
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
              region: region,
              avatar: user.avatar,
            },
          });
        });
      }
    } catch (error) {
      console.error("Lỗi khi đăng nhập:", error);
      console.log("Session khi xảy ra lỗi:", req.session);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });

  router.get("/quenmatkhau", (req, res) => {
    res.sendFile(path.join(__dirname, "../../public/account/quenmatkhau.html"));
  });

  router.post("/reset-passwd", async function (req, res) {
    const { email, newPassword, recaptchaResponse } = req.body;
    
    try {
        // Validate input và verify reCAPTCHA
        if (!email || !newPassword || !recaptchaResponse) {
            return res.status(400).json({
                message: "Vui lòng điền đầy đủ thông tin và xác thực reCAPTCHA"
            });
        }

        // Verify reCAPTCHA
        const secretKey = '6LfDTuQqAAAAALINytqdW5QvK9Ubm7pkqQup5TgS';
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaResponse}`;
        const verifyResponse = await axios({
            method: 'post',
            url: verifyUrl,
            headers: {  
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!verifyResponse.data.success) {
            return res.status(400).json({
                message: 'Xác thực reCAPTCHA thất bại, vui lòng thử lại',
                errors: verifyResponse.data['error-codes']
            });
        }

        // Kiểm tra password mới có đủ mạnh không (theo constraint của DB)
        if (newPassword.length < 8 || !/.*[0-9].*/.test(newPassword)) {
            return res.status(400).json({
                message: "Mật khẩu phải có ít nhất 8 ký tự và chứa ít nhất 1 số"
            });
        }

        // Tìm user
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        
        if (users.length === 0) {
            return res.status(404).json({
                message: "Email không tồn tại trong hệ thống"
            });
        }

        // Tạo token reset password
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const expiryTime = new Date(Date.now() + 3600000); // 1 giờ

        // Lưu token và mật khẩu tạm thời
        await db.query(
            "UPDATE users SET reset_password_token = ?, temp_password = ?, reset_password_expires = ? WHERE email = ?",
            [resetToken, hashedPassword, expiryTime, email]
        );

        // Tạo link xác nhận
        const resetUrl = `${req.protocol}://${req.get('host')}/api/confirm-reset-password/${resetToken}`;
        
        // Gửi email xác nhận sử dụng hàm sendEmail có sẵn
        const templatePath = path.join(__dirname, '../../templates/reset-password.html');
        await sendEmail(
            email,
            users[0].name,
            resetUrl,
            'Xác nhận đặt lại mật khẩu',
            templatePath
        );

        return res.status(200).json({
            message: "Vui lòng kiểm tra email của bạn để xác nhận đặt lại mật khẩu"
        });

    } catch (error) {
        console.error("Server error:", error);
        return res.status(500).json({
            message: "Lỗi hệ thống, vui lòng thử lại sau",
            error: error.message
        });
    }
  });

  // Route xử lý xác nhận reset password
  router.get("/confirm-reset-password/:token", async function (req, res) {
    try {
        const { token } = req.params;

        // Tìm user với token hợp lệ và chưa hết hạn
        const [users] = await db.query(
            "SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()",
            [token]
        );

        if (users.length === 0) {
            return res.status(400).send("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
        }

        const user = users[0];

        // Cập nhật mật khẩu mới và xóa các trường temporary
        await db.query(
            "UPDATE users SET passwd = ?, reset_password_token = NULL, temp_password = NULL, reset_password_expires = NULL WHERE email = ?",
            [user.temp_password, user.email]
        );

        // Chuyển hướng về trang đăng nhập với thông báo thành công
        res.redirect('/account/dangnhap.html?reset=success');

    } catch (error) {
        console.error("Lỗi khi xác nhận đặt lại mật khẩu:", error);
        res.status(500).send("Đã xảy ra lỗi khi xác nhận đặt lại mật khẩu");
    }
  });

  router.get("/admin-info", (req, res) => {
    if (req.session.adminName) {
      res.json({ adminName: req.session.adminName });
    } else {
      res.status(401).json({ message: "Chưa đăng nhập" });
    }
  });
  router.get("/user-info", async (req, res) => {
    console.log("Session trong /api/user-info:", req.session);
    console.log("isLoggedIn:", req.session.isLoggedIn);
    console.log("roleId:", req.session.roleId);

    if (req.session && req.session.isLoggedIn) {
      try {
        if (req.session.adminId) {
          // Trả về thông tin admin
          res.json({
            userId: req.session.adminId,
            name: req.session.adminName,
            email: req.session.adminEmail,
            roleId: req.session.roleId,
            isAdmin: true,
            province_id: req.session.province_id,
          });
        } else if (req.session.userId) {
          // Lấy thông tin chi tiết cho user
          const [provinces] = await db.query(
            "SELECT * FROM provinces WHERE province_id = ?",
            [req.session.province_id]
          );
          const [districts] = await db.query(
            "SELECT * FROM districts WHERE district_id = ?",
            [req.session.district_id]
          );
          const [wards] = await db.query(
            "SELECT * FROM wards WHERE ward_id = ?",
            [req.session.ward_id]
          );

          let region = null;
          if (req.session.region_id) {
            const [regions] = await db.query(
              "SELECT region_name FROM regions WHERE region_id = ?",
              [req.session.region_id]
            );
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
            province: provinces[0]?.province_name,
            district: districts[0]?.district_name,
            ward: wards[0]?.ward_name,
            region_id: req.session.region_id,
            region: region,
            avatar: req.session.avatar,
          });
        } else {
          res.status(400).json({ error: "Trạng thái đăng nhập không hợp lệ" });
        }
      } catch (error) {
        console.error("Lỗi khi lấy thông tin user:", error);
        res
          .status(500)
          .json({
            message: "Lỗi server khi lấy thông tin user",
            error: error.message,
          });
      }
    } else {
      res.status(401).json({
        message:
          "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
        name: "Người dùng ẩn danh",
        roleId: 0,
        isAdmin: false,
      });
    }
  });

  return router;
};
