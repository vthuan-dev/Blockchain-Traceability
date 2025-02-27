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

  let globalNewPassword = "";

  router.post("/reset-passwd", async function (req, res) {
    const { email, newPassword, recaptchaResponse } = req.body;

    try {
      // Verify reCAPTCHA first
      const recaptchaVerifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
      const verifyResponse = await axios.post(recaptchaVerifyUrl, null, {
        params: {
          secret: '6LfETuQqAAAAAJiJqnltTbrrprFcYytET3K9RWXD', // Secret key
          response: recaptchaResponse
        }
      });

      if (!verifyResponse.data.success) {
        return res.status(400).json({ 
          message: 'Xác thực reCAPTCHA thất bại' 
        });
      }

      // Check if user exists
      const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      const user = users[0];

      if (!user) {
        return res.status(400).json({ message: "Email không tồn tại" });
      }

      if (!user.is_approved) {
        return res.status(400).json({ 
          message: "Tài khoản chưa được phê duyệt" 
        });
      }

      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex');
      globalNewPassword = newPassword;

      // Update user's verification token
      await db.query(
        "UPDATE users SET verificationToken = ? WHERE email = ?",
        [token, email]
      );

      // Send reset password email
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://truyxuatbuoi.xyz/api` 
        : `https://truyxuatbuoi.xyz/api`;
      const resetLink = `${baseUrl}/reset-password/${token}`;
      const templatePath = path.join(
        __dirname,
        "../../public/account/xacthuc.html"
      );

      await sendEmail(
        email,
        user.name,
        resetLink,
        "Xác thực đặt lại mật khẩu",
        templatePath
      );

      res.status(200).json({ 
        message: "Yêu cầu đặt lại mật khẩu đã được gửi" 
      });
    } catch (error) {
      console.error("Lỗi:", error);
      res.status(500).json({ 
        message: "Lỗi khi đặt lại mật khẩu" 
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
