require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const fs = require("node:fs").promises;
const path = require("node:path");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const crypto = require("node:crypto");
const { sendEmail } = require("./sendmail");
const axios = require("axios");
const db = require("../../config/db");
const {
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  authenticateAnonymously,
  admin,
  adminBucket,
} = require("../../firebase");
const { registerNotification } = require("../../notification");

const jsonData = require("./data.json");

const router = express.Router();

// Sử dụng memoryStorage thay vì diskStorage
const upload = multer({ storage: multer.memoryStorage() });

function validateInput(data) {
  const requiredFields = [
    "name",
    "email",
    "password",
    "phone",
    "dob",
    "gender",
    "role_id",
    "province_id",
    "district_id",
    "ward_id",
    "specific_address",
  ];
  // Chỉ yêu cầu region_id cho vai trò người sản xuất và kiểm định
  if (data.role_id === "1" || data.role_id === "2") {
    requiredFields.push("region_id");
  }
  return requiredFields.filter((field) => !data[field]);
}

function getRoleName(roleId) {
  const roles = {
    1: "Nhà Sản Xuất",
    2: "Kiểm Duyệt", 
    6: "Vận Chuyển",
    8: "Nhà Kho"
  };
  return roles[roleId] || "Không xác định";
}

async function fetchDataFromJson() {
  try {
    const data = await fs.readFile(path.join(__dirname, "data.json"), "utf8");
    const parsedData = JSON.parse(data);
    // console.log("Dữ liệu từ file JSON:", parsedData);
    return parsedData.data; // Trả về mảng data thay vì toàn bộ object
  } catch (error) {
    console.error("Lỗi khi đọc dữ liệu từ file JSON:", error);
    throw error;
  }
}

async function validateLocationIds(provinceId, districtId, wardId) {
  const connection = await db.getConnection();
  try {
    console.log("Validating IDs:", { provinceId, districtId, wardId });

    // Kiểm tra province_id
    const [provinces] = await connection.query(
      "SELECT * FROM provinces WHERE province_id = ?",
      [provinceId]
    );
    if (provinces.length === 0) {
      throw new Error(`Mã tỉnh/thành phố không hợp lệ: ${provinceId}`);
    }
    console.log("Found province:", provinces[0].province_name);

    // Kiểm tra và thêm district nếu cần
    let [districts] = await connection.query(
      "SELECT * FROM districts WHERE district_id = ? AND province_id = ?",
      [districtId, provinceId]
    );
    if (districts.length === 0) {
      console.log(
        "District not found. Adding new district with ID:",
        districtId
      );
      await connection.query(
        "INSERT INTO districts (district_id, district_name, province_id) VALUES (?, ?, ?)",
        [districtId, `Huyện ${districtId}`, provinceId]
      );
      districts = [
        { district_id: districtId, district_name: `Huyện ${districtId}` },
      ];
    }
    console.log("Found/Added district:", districts[0].district_name);

    // Kiểm tra và thêm ward nếu cần
    let [wards] = await connection.query(
      "SELECT * FROM wards WHERE ward_id = ? AND district_id = ?",
      [wardId, districtId]
    );
    if (wards.length === 0) {
      console.log("Ward not found. Adding new ward with ID:", wardId);
      await connection.query(
        "INSERT INTO wards (ward_id, ward_name, district_id) VALUES (?, ?, ?)",
        [wardId, `Xã ${wardId}`, districtId]
      );
      wards = [{ ward_id: wardId, ward_name: `Xã ${wardId}` }];
    }
    console.log("Found/Added ward:", wards[0].ward_name);

    console.log("Validation successful:", {
      province: provinces[0].province_name,
      district: districts[0].district_name,
      ward: wards[0].ward_name,
    });

    return { provinceId, districtId, wardId };
  } catch (error) {
    console.error("Validation error:", error.message);
    throw error;
  } finally {
    connection.release();
  }
}

async function checkDatabaseProvinces() {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query("SELECT * FROM provinces");
  } finally {
    connection.release();
  }
}
checkDatabaseProvinces();

module.exports = (db) => {
  router.get("/dangky", (req, res) => {
    res.sendFile(path.join(__dirname, "../../public/account/dangky.html"));
  });

  async function recordExists(query, param) {
    try {
      const [rows] = await db.query(query, param);
      return rows.length > 0;
    } catch (error) {
      if (error.code === "ECONNRESET") {
        console.error("Connection was reset. Retrying...");
      } else {
        throw error;
      }
    }
  }

  async function emailExists(email) {
    try {
      const [userRows] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      const [adminRows] = await db.query(
        "SELECT * FROM admin WHERE admin_email = ?",
        [email]
      );
      return userRows.length > 0 || adminRows.length > 0;
    } catch (error) {
      console.error("Lỗi khi kiểm tra email:", error);
      throw error;
    }
  }
  router.get("/provinces", (req, res) => {
    try {
      const provinces = jsonData.data.map((province) => ({
        id: province.id,
        name: province.name,
      }));
      res.json(provinces);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách tỉnh:", error);
      res.status(500).json({ error: "Không thể lấy danh sách tỉnh" });
    }
  });

  router.get("/districts/:provinceId", async (req, res) => {
    const provinceId = req.params.provinceId;
    try {
      console.log("Đang lấy dữ liệu huyện cho tỉnh:", provinceId);
      const provincesData = await fetchDataFromJson();
      const province = provincesData.find((p) => p.id === provinceId);

      if (province?.data2) {
        res.json(province.data2);
      } else {
        console.log(
          "Không tìm thấy tỉnh hoặc dữ liệu huyện với ID:",
          provinceId
        );
        res.status(404).json({ error: "Không tìm thấy dữ liệu huyện" });
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu huyện:", error);
      res.status(500).json({ error: "Không thể lấy dữ liệu huyện" });
    }
  });

  router.get("/wards/:districtId", async (req, res) => {
    const districtId = req.params.districtId;
    try {
      const provincesData = await fetchDataFromJson();
      let wards = [];

      // Tìm huyện có id trùng khớp
      for (const province of provincesData) {
        const district = province.data2.find((d) => d.id === districtId);
        if (district) {
          wards = district.data3;
          break;
        }
      }

      if (wards.length > 0) {
        res.json(wards);
      } else {
        res
          .status(404)
          .json({ error: "Không tìm thấy xã/phường cho huyện ny" });
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách xã/phường:", error);
      res.status(500).json({ error: "Không thể lấy dữ liệu xã/phường" });
    }
  });

  router.get("/regions", async (req, res) => {
    try {
      const provinceId = req.query.province_id;

      if (!provinceId) {
        return res.status(400).json({ error: "Thiếu mã tỉnh" });
      }

      console.log("Đang truy vấn regions cho tỉnh:", provinceId);

      const [regions] = await db.query(
        "SELECT * FROM regions WHERE LEFT(region_id, 2) = ?",
        [provinceId.substring(0, 2)]
      );

      console.log("Kết quả truy vấn regions:", regions);

      if (regions.length === 0) {
        return res
          .status(404)
          .json({ error: "Không tìm thấy vùng sản xuất cho tỉnh này" });
      }

      res.json(regions);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách vùng sản xuất:", error);
      res.status(500).json({ error: "Lỗi khi lấy danh sách vùng sản xuất" });
    }
  });

  router.post("/register", upload.single("avatar"), async (req, res) => {
    let connection;
    let tempImgUrl = null;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      console.log("Bắt đầu xử lý yêu cầu đăng ký");

      const {
        name,
        email,
        password,
        phone,
        address,
        dob,
        gender,
        role_id,
        region_id,
        province_id,
        district_id,
        ward_id,
      } = req.body;
      const avatar = req.file;
      console.log("Dữ liệu nhận được từ client:", req.body, req.file);

      const missingFields = validateInput(req.body);

      if (missingFields.length > 0) {
        return res
          .status(400)
          .json({
            message: `Yêu cầu nhập đúng dữ liệu đầu vào. Missing: ${missingFields.join(
              ", "
            )}`,
          });
      }

      if (await emailExists(email)) {
        return res.status(400).json({
          message: "Email này đã được sử dụng. Vui lòng chọn email khác."
        });
      }
    
      // Kiểm tra số điện thoại đã tồn tại
      const phoneExistsQuery = "SELECT * FROM users WHERE phone = ?";
      if (await recordExists(phoneExistsQuery, [phone])) {
        return res.status(400).json({
          message: "Số điện thoại này đã được sử d��ng. Vui lòng chọn số khác."
        });
      }
    

      console.log("Checking IDs:", { province_id, district_id, ward_id });

      // Chuyển đổi các giá trị ID từ chuỗi sang số nguyên
      const provinceId = Number.parseInt(province_id, 10);
      const districtId = Number.parseInt(district_id, 10);
      const wardId = Number.parseInt(ward_id, 10);

      // Xác thực các ID địa chỉ và thêm huyện/xã mới nếu cần
      const validatedIds = await validateLocationIds(
        provinceId,
        districtId,
        wardId
      );

      // Sử dụng các ID đã được xác thực
      const {
        provinceId: validProvinceId,
        districtId: validDistrictId,
        wardId: validWardId,
      } = validatedIds;

      // Xử lý upload avatar
      if (avatar) {
        try {
          const sanitizedFileName = avatar.originalname
            .replace(/\s+/g, "_")
            .toLowerCase();
          const fileName = `avatars/${Date.now()}_${sanitizedFileName}`;
          const file = adminBucket.file(fileName);

          await file.save(avatar.buffer, {
            metadata: { contentType: avatar.mimetype },
          });

          const [url] = await file.getSignedUrl({
            action: "read",
            expires: "03-09-2491",
          });

          tempImgUrl = url;
          console.log("Avatar đã được upload:", tempImgUrl);
        } catch (uploadError) {
          console.error("Lỗi khi upload avatar:", uploadError);
          throw new Error("Lỗi khi upload avatar");
        }
      }

      // Tạo fullAddress từ các thành phần địa ch
      // const fullAddress = `${specific_address}, ${ward_id}, ${district_id}, ${province_id}`;

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(20).toString("hex");

      
      const sql =
        "INSERT INTO users (name, email, passwd, phone, address, dob, gender, role_id, region_id, province_id, district_id, ward_id, avatar, verificationToken) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      const values = [
        name,
        email,
        hashedPassword,
        phone,
        address,
        dob,
        gender,
        Number.parseInt(role_id, 10),
        region_id || null,
        validProvinceId,
        validDistrictId,
        validWardId,
        tempImgUrl,
        verificationToken,
      ];

      const [result] = await connection.query(sql, values);
      const userId = result.insertId;

      // Sau khi insert user thành công
      const verifyUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://truyxuatnguongbuoi.com';
      const verificationLink = `${verifyUrl}/api/verify/${verificationToken}`;
      await sendEmail(
        email,
        name,
        verificationLink,
        "Xác thực tài khoản của bạn",
        path.join(__dirname, "../../public/account/xacthuc.html")
      );

      const message = `Người dùng mới ${name} đã đăng ký với vai trò ${getRoleName(role_id)}`;
      await registerNotification(connection, userId, message, 1);

      await connection.commit();
      res.status(201).json({
        message:
          "Đã đăng ký tài khoản người dùng thành công. Vui lòng kiểm tra email của bạn để xác thực tài khoản.",
        email: email,
        avatarUrl: tempImgUrl,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error("Lỗi chi tiết khi đăng ký:", error);
      if (error.code === "ENOENT") {
        res
          .status(500)
          .json({
            error:
              "Không tìm thấy file template email. Vui lòng kiểm tra lại đường dẫn.",
          });
      } else if (error.message.includes("email")) {
        res
          .status(500)
          .json({
            error:
              "Không thể gửi email xác thực. Vui lòng kiểm tra email của bạn.",
          });
      } else {
        res
          .status(500)
          .json({ error: `Lỗi khi xử lý yêu cầu đăng ký: ${error.message}` });
      }
    } finally {
      if (connection) {
        connection.release();
      }
    }
  });

  router.get(["/verify/:token", "/verify/:token"], async (req, res) => {
    const { token } = req.params;
    try {
      const [result] = await db.query(
        "UPDATE users SET is_approved = true WHERE verificationToken = ?",
        [token]
      );
      if (result.affectedRows > 0) {
        res.redirect("/api/dangnhap"); // Chuyển hướng đến trang đăng nhập
      } else {
        res.status(400).send("Token xác thực không hợp lệ hoặc đã hết hạn.");
      }
    } catch (error) {
      console.error("Lỗi khi xác thực:", error);
      res.status(500).send("Đã xảy ra lỗi khi xác thực tài khoản.");
    }
  });
  router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Đã xảy ra lỗi server" });
  });

  //  console.log('Các route đã đăng ký trong dangky.js:', router.stack.map(layer => layer.route?.path).filter(Boolean));

  return router;
};

