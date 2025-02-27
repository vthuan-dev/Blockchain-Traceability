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
    
    console.log("Reset password request received:", {
        email,
        hasRecaptchaResponse: !!recaptchaResponse
    });

    try {
        // Validate input
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

        console.log('reCAPTCHA verification response:', verifyResponse.data);

        if (!verifyResponse.data.success) {
            return res.status(400).json({
                message: 'Xác thực reCAPTCHA thất bại, vui lòng thử lại',
                errors: verifyResponse.data['error-codes']
            });
        }

        // Tìm user với email
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        
        if (users.length === 0) {
            return res.status(404).json({
                message: "Email không tồn tại trong hệ thống"
            });
        }

        // Hash password mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Sửa từ 'password' thành 'passwd' để khớp với tên cột trong database
        await db.query("UPDATE users SET passwd = ? WHERE email = ?", [
            hashedPassword,
            email
        ]);

        return res.status(200).json({
            message: "Đặt lại mật khẩu thành công"
        });

    } catch (error) {
        console.error("Server error:", error);
        return res.status(500).json({
            message: "Lỗi hệ thống, vui lòng thử lại sau",
            error: error.message
        });
    }
  });

  router.get("/reset-password/:token", async function (req, res) {
    const { token } = req.params;
    try {
      const [users] = await db.query(
        "SELECT * FROM users WHERE verificationToken = ?",
        [token]
      );
      const user = users[0];

      if (!user) {
        return res
          .status(400)
          .send("Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      }

      const hashedPassword = await bcrypt.hash(globalNewPassword, 10);

      await db.query(
        "UPDATE users SET passwd = ? WHERE verificationToken = ?",
        [hashedPassword, token]
      );

      res.redirect("/dangnhap.html");
    } catch (error) {
      console.error("Lỗi khi đặt lại mật khẩu:", error);
      res.status(500).send("Đã xảy ra lỗi khi đặt lại mật khẩu.");
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
