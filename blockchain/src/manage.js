const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const fs = require("fs").promises;
const axios = require("axios");
const {
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  authenticateAnonymously,
  admin,
  adminBucket,
} = require("./firebase");

// Thêm require để đọc file data.json
const locationData = require('./components/user/data.json');

const router = express.Router(); // Sử dụng Router
router.use(cors()); // Cho phép CORS để client có thể gọi API
router.use(bodyParser.json());
router.use(express.urlencoded({ extended: true })); // Thêm middleware để xử lý dữ liệu URL-encoded

// Cấu hình multer để sử dụng bộ nhớ tạm thời
const upload = multer({ storage: multer.memoryStorage() });
const db = require("./config/db.js");

// Utility function để chuyển đổi callback thành Promise
const promisify =
  (fn) =>
  (...args) => {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };

// Hàm để thực hiện truy vấn
async function queryDatabase(query, params) {
  const connection = await db.getConnection();
  try {
    const [results] = await connection.query(query, params);
    return results;
  } catch (error) {
    console.error("Lỗi khi truy vấn dữ liệu:", error);
    throw error;
  } finally {
    connection.release();
  }
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}




// Endpoint để lấy thông tin người dùng
router.get("/api/users", async (req, res) => {
  try {
    const query = "SELECT * FROM users";
    const results = await queryDatabase(query, []);
    res.json(results);
  } catch (error) {
    console.error("Lỗi khi truy vấn dữ liệu:", error);
    res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
});

// Endpoint để lấy thông tin sản phẩm
router.get("/api/theproducts", async (req, res) => {
  try {
    const query = "SELECT * FROM products";
    const results = await queryDatabase(query, []);
    res.json(results);
  } catch (error) {
    console.error("Lỗi khi truy vấn dữ liệu:", error);
    res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
});

async function saveProductImage(file) {
  try {
    const sanitizedFileName = file.originalname.replace(/\s+/g, "_").toLowerCase();
    const fileName = `${Date.now()}_${sanitizedFileName}`;
    // Thay đổi đường dẫn để lưu vào thư mục product trong source
    const uploadPath = path.join(__dirname, 'public/uploads/product', fileName);
    
    // Đảm bảo thư mục tồn tại
    await fs.mkdir(path.dirname(uploadPath), { recursive: true });
    
    await fs.writeFile(uploadPath, file.buffer);
    // Trả về đường dẫn tương đối từ thư mục public
    return `/uploads/product/${fileName}`;
  } catch (error) {
    console.error("Lỗi khi lưu file:", error);
    throw new Error("Lỗi khi lưu file");
  }
}

// Thêm endpoint mới để xử lý việc thêm sản phẩm
router.post("/api/products", upload.single("img"), async (req, res) => {
  let connection;
  let tempImgUrl = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    console.log("Bắt đầu xử lý yêu cầu thêm sản phẩm");

    const { product_name, price, description, uses, process } = req.body;
    const img = req.file;
    console.log("Dữ liệu nhận được từ client:", req.body, req.file);

    if (!product_name || !price || !description || !img || !uses || !process) {
      return res.status(400).json({ error: "Thiếu thông tin sản phẩm" });
    }

    if (img) {
      try {
        const imgUrl = await saveProductImage(img);
        tempImgUrl = imgUrl;
        console.log("Hình ảnh sản phẩm đã được lưu:", tempImgUrl);
      } catch (uploadError) {
        console.error("Lỗi khi lưu hình ảnh:", uploadError);
        throw new Error("Lỗi khi lưu hình ảnh");
      }
    }

    const query =
      "INSERT INTO products (product_name, price, description, img, uses, process) VALUES (?, ?, ?, ?, ?, ?)";
    const [result] = await connection.query(query, [
      product_name,
      price,
      description,
      tempImgUrl,
      uses,
      process,
    ]);

    console.log("Kết quả sau khi thêm vào cơ sở dữ liệu:", result);

    if (result.affectedRows === 0) {
      throw new Error("Không có hàng nào được thêm vào cơ sở dữ liệu");
    }

    await connection.commit();
    res
      .status(201)
      .json({
        message: "Sản phẩm đã được thêm thành công",
        id: result.insertId,
        imgUrl: tempImgUrl,
      });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi chi tiết:", error);
    console.error("Stack trace:", error.stack);
    let errorMessage = "Lỗi khi xử lý yêu cầu thêm sản phẩm";
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    res.status(500).json({ error: errorMessage });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
// Endpoint để xóa sản phẩm
router.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const query = "DELETE FROM products WHERE product_id = ?";
    const results = await queryDatabase(query, [id]);
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }
    res.status(200).json({ message: "Sản phẩm đã được xóa thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm:", error);
    res.status(500).json({ error: "Lỗi khi xóa sản phẩm" });
  }
});

// Endpoint để xóa người dùng
router.delete("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Xóa các ràng buộc khóa ngoại trong bảng batch trước
    await connection.query(
      "UPDATE batch SET approved_by = NULL WHERE approved_by = ?",
      [userId]
    );

    // Xóa các hàng liên quan trong bảng register
    await connection.query("DELETE FROM register WHERE actor_id = ?", [userId]);

    // Xóa các hàng liên quan trong bảng notification_change
    await connection.query(
      "DELETE FROM notification_change WHERE actor_id = ?",
      [userId]
    );

    // Xóa các hàng liên quan trong bảng notification
    await connection.query("DELETE FROM notification WHERE user_id = ?", [
      userId,
    ]);

    // Xóa người dùng
    await connection.query("DELETE FROM users WHERE uid = ?", [userId]);

    await connection.commit();
    res.status(200).json({ message: "Người dùng đã được xóa thành công" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi khi xóa người dùng:", error);
    res
      .status(500)
      .json({ message: "Lỗi khi xóa người dùng", error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Cấu hình để phục vụ các tệp tĩnh
router.use(express.static(path.join(__dirname, "public")));

// Route để phục vụ tệp user.html
router.get("/user.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "user.html"));
});

router.get("/product", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "product.html"));
});

router.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "admintest.html"));
});

router.get("/caidat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "caidat.html"));
});

// Endpoint để cập nhật sản phẩm
router.post("/api/products/update", upload.single("img"), async (req, res) => {
  let connection;
  let tempImgUrl = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    console.log("Dữ liệu nhận được:", req.body, req.file);

    const { product_id, product_name, price, description, uses, process } =
      req.body;

    let updateFields = [];
    let updateValues = [];

    // Xử lý các trường thông tin khác
    const fields = { product_name, price, description, uses, process };
    for (const [key, value] of Object.entries(fields)) {
      if (value) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    // Xử lý hình ảnh
    if (req.file) {
      try {
        // Xóa hình ảnh cũ
const [oldProduct] = await connection.query(
  "SELECT img FROM products WHERE product_id = ?",
  [product_id]
);

if (oldProduct[0] && oldProduct[0].img) {
  try {
      // Lấy tên file từ đường dẫn đầy đủ
      const oldFileName = oldProduct[0].img.split('/').pop();
      // Đường dẫn đến file ảnh cũ trong thư mục product
      const oldPath = path.join(__dirname, 'public/uploads/product', oldFileName);
      
      // Kiểm tra file có tồn tại không trước khi xóa
      const fileExists = await fs.access(oldPath).then(() => true).catch(() => false);
      if (fileExists) {
          await fs.unlink(oldPath);
          console.log("Đã xóa file ảnh cũ:", oldFileName);
        }
      } catch (error) {
        console.error("Lỗi khi xóa hình ảnh cũ:", error);
      }
    }

        // Lưu hình ảnh mới
        const imgUrl = await saveProductImage(req.file);
        tempImgUrl = imgUrl;
        updateFields.push("img = ?");
        updateValues.push(tempImgUrl);

        console.log("Hình ảnh mới đã được lưu:", tempImgUrl);
      } catch (uploadError) {
        console.error("Lỗi khi lưu hình ảnh:", uploadError);
        throw new Error("Lỗi khi lưu hình ảnh");
      }
    }

    if (updateFields.length > 0) {
      const updateQuery = `UPDATE products SET ${updateFields.join(
        ", "
      )} WHERE product_id = ?`;
      updateValues.push(product_id);

      console.log("Update Query:", updateQuery);
      console.log("Update Values:", updateValues);

      const [result] = await connection.query(updateQuery, updateValues);
      console.log("Update Result:", result);

      if (result.affectedRows === 0) {
        throw new Error("Không có hàng nào được cập nhật trong cơ sở dữ liệu");
      }

      await connection.commit();
      res.json({
        updated: true,
        message: "Sản phẩm đã được cập nhật",
        imgUrl: tempImgUrl,
      });
    } else {
      res.json({
        updated: false,
        message: "Không có thông tin nào được cập nhật",
      });
    }
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi chi tiết khi cập nhật sản phẩm:", error);
    let errorMessage = "Lỗi khi cập nhật sản phẩm";
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    res.status(500).json({ error: errorMessage });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Hàm kiểm tra email tồn tại
async function checkEmailExists(email) {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM admin WHERE admin_email = ?) as admin_count,
      (SELECT COUNT(*) FROM users WHERE email = ?) as user_count
  `;
  const results = await queryDatabase(query, [email, email]);
  return results[0].admin_count > 0 || results[0].user_count > 0;
}

// API endpoint kiểm tra email
// router.get('/api/check-admin-email', async (req, res) => {
//   const email = req.query.email;


//   try {
//     const exists = await checkEmailExists(email);
//     res.json({ exists });
//   } catch (error) {
//     console.error('Lỗi kiểm tra email:', error);
//     res.status(500).json({ error: 'Lỗi server' });
//   }
// });

// Cập nhật endpoint tạo admin mới
router.post("/api/admin", async (req, res) => {
  const { email, name, password, province_id } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: "Thiếu thông tin admin" });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Email không đúng định dạng" });
  }

  // Kiểm tra xem email đã tồn tại chưa
  const emailExists = await checkEmailExists(email);
  if (emailExists) {
    return res.status(400).json({ error: "Email này đã được sử dụng trong hệ thống" });
  }

  try {
    const hashedPassword = await promisify(bcrypt.hash)(password, 10);
    const query =
      "INSERT INTO admin (admin_email, admin_name, admin_pass, role_id, province_id) VALUES (?, ?, ?, ?, ?)";
    const results = await queryDatabase(query, [
      email,
      name,
      hashedPassword,
      3,
      province_id,
    ]);
    res
      .status(201)
      .json({ message: "Admin đã được thêm thành công", id: results.insertId });
  } catch (error) {
    console.error("Lỗi khi thêm admin:", error);
    res.status(500).json({ error: "Lỗi khi thêm admin" });
  }
});

// Cập nhật endpoint lấy thông tin tỉnh
router.get("/province/:id", async (req, res) => {
  const { id } = req.params;
  const query = "SELECT province_name FROM provinces WHERE province_id = ?";
  try {
    const results = await queryDatabase(query, [id]);
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: "Không tìm thấy tỉnh" });
    }
  } catch (error) {
    console.error("Lỗi khi truy vấn dữ liệu:", error);
    res.status(500).json({ error: "Lỗi khi truy vấn dữ liệu" });
  }
});

// Endpoint để lấy thông tin session
router.get("/api/session", (req, res) => {
  const provinceId = req.session.province_id; // Giả sử bạn lưu province_id trong session
  if (!provinceId) {
    return res
      .status(400)
      .json({ error: "Không tìm thấy province_id trong session" });
  }
  res.json({ province_id: provinceId });
});

router.get("/districts/:provinceCode", async (req, res) => {
  try {
    console.log("Đang lấy districts cho tỉnh:", req.params.provinceCode);
    
    // Lấy dữ liệu từ data.json
    const provinces = locationData.data;
    // Tìm province theo id
    const province = provinces.find(p => p.id === req.params.provinceCode);
    
    if (!province || !province.data2) {
      return res.status(404).json({ error: "Không tìm thấy dữ liệu quận/huyện" });
    }

    // Map data2 (districts) sang format mong muốn
    const districts = province.data2.map(d => ({
      district_id: d.id,
      district_name: d.name
    }));

    console.log("Kết quả districts:", districts);
    res.json(districts);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách quận/huyện:", error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách quận/huyện" });
  }
});

router.get("/wards/:districtCode", async (req, res) => {
  try {
    console.log("Đang lấy wards cho quận/huyện:", req.params.districtCode);
    
    let foundWards = null;
    const provinces = locationData.data;

    // Tìm ward trong tất cả các tỉnh
    for (const province of provinces) {
      if (province.data2) {
        const district = province.data2.find(d => d.id === req.params.districtCode);
        if (district && district.data3) {
          foundWards = district.data3;
          break;
        }
      }
    }

    if (!foundWards) {
      return res.status(404).json({ error: "Không tìm thấy dữ liệu xã/phường" });
    }

    // Map data3 (wards) sang format mong muốn
    const wards = foundWards.map(w => ({
      ward_id: w.id,
      ward_name: w.name
    }));

    console.log("Kết quả wards:", wards);
    res.json(wards);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách xã/phường:", error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách xã/phường" });
  }
});

// Cập nhật endpoint thêm vùng sản xuất mới
router.post("/api/regions", async (req, res) => {
  const { province_id, district_id, region_name, ward_name, district_name } =
    req.body;

  if (!province_id || !district_id || !region_name || !ward_name) {
    return res.status(400).json({ error: "Thiếu thông tin vùng sản xuất" });
  }

  try {
    const queryMaxId =
      "SELECT MAX(region_id) AS max_id FROM regions WHERE region_id LIKE ?";
    const regionPrefix = `${province_id}${district_id}%`;
    const results = await queryDatabase(queryMaxId, [regionPrefix]);

    let newRegionId;
    if (results[0].max_id) {
      const maxId = results[0].max_id;
      const currentNumber = parseInt(maxId.slice(-3), 10);
      newRegionId = `${province_id}${district_id}${String(
        currentNumber + 1
      ).padStart(3, "0")}`;
    } else {
      newRegionId = `${province_id}${district_id}001`;
    }

    const queryInsert =
      "INSERT INTO regions (region_id, region_name, ward_name, district_name) VALUES (?, ?, ?, ?)";
    await queryDatabase(queryInsert, [
      newRegionId,
      region_name,
      ward_name,
      district_name,
    ]);
    res
      .status(201)
      .json({
        success: true,
        message: "Vùng sản xuất đã được thêm thành công",
      });
  } catch (error) {
    console.error("Lỗi khi thêm vùng sản xuất:", error);
    res.status(500).json({ error: "Lỗi khi thêm vùng sản xuất" });
  }
});

// Cập nhật endpoint lấy danh sách vùng sản xuất
router.get("/api/regions", async (req, res) => {
  const adminProvinceId = req.query.province_id;

  if (!adminProvinceId) {
    return res.status(400).json({ error: "Thiếu mã tỉnh của admin" });
  }

  const query = "SELECT * FROM regions WHERE LEFT(region_id, 2) = ?";

  try {
    const results = await queryDatabase(query, [adminProvinceId]);
    res.json(results);
  } catch (error) {
    console.error("Lỗi khi truy vấn dữ liệu:", error);
    res.status(500).json({ error: "Lỗi khi truy vấn dữ liệu" });
  }
});

// Cập nhật endpoint xóa vùng sản xuất
router.delete("/api/regions/:id", async (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM regions WHERE region_id = ?";
  try {
    await queryDatabase(query, [id]);
    res.status(200).json({ message: "Vùng sản xuất đã được xóa thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa vùng sản xuất:", error);
    res.status(500).json({ error: "Lỗi khi xóa vùng sản xuất" });
  }
});

// Thêm endpoint mới để lấy thống kê người dùng
router.get("/api/users/stats", async (req, res) => {
  try {
    // Truy vấn thống kê giới tính
    const genderQuery = `
            SELECT 
                CASE 
                    WHEN gender = 'Nam' THEN 'male'
                    WHEN gender = 'Nữ' THEN 'female'
                    ELSE 'other'
                END AS gender, 
                COUNT(*) AS count 
            FROM users 
            GROUP BY gender
        `;
    const genderResults = await queryDatabase(genderQuery);

    // Truy vấn thống kê vai trò
    const roleQuery = `
            SELECT 
                CASE
                    WHEN role_id = 1 THEN 'Sản xuất'
                    WHEN role_id = 2 THEN 'Kiểm duyệt'
                    WHEN role_id = 6 THEN 'Vận chuyển'
                    WHEN role_id = 8 THEN 'Nhà kho'
                END AS role, 
                COUNT(*) AS count 
            FROM users 
            GROUP BY role_id
        `;
    const roleResults = await queryDatabase(roleQuery);

    // Truy vấn thống kê độ tuổi
    const ageQuery = `
            SELECT
                CASE
                    WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) BETWEEN 18 AND 25 THEN 'age18to25'
                    WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) BETWEEN 26 AND 35 THEN 'age26to35'
                    WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) BETWEEN 36 AND 45 THEN 'age36to45'
                    ELSE 'age46plus'
                END AS age_group,
                COUNT(*) AS count
            FROM users
            GROUP BY age_group
        `;
    const ageResults = await queryDatabase(ageQuery);

    // Xử lý kết quả và tạo đối tượng phản hồi
    const genderData = genderResults.reduce((acc, item) => {
      acc[item.gender] = item.count;
      return acc;
    }, {});

    const roleData = roleResults.reduce((acc, item) => {
      acc[item.role] = item.count;
      return acc;
    }, {});

    const ageData = ageResults.reduce((acc, item) => {
      acc[item.age_group] = item.count;
      return acc;
    }, {});

    res.json({
      genderData,
      roleData,
      ageData,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thống kê người dùng:", error);
    res.status(500).json({ error: "Lỗi khi lấy thống kê người dùng" });
  }
});

// Thêm endpoint mới để lấy thống kê người dùng theo tỉnh
router.get("/api/users/stats/province", async (req, res) => {
  try {
    const query = `
            SELECT u.province_id, p.province_name, COUNT(*) as user_count
            FROM users u
            JOIN provinces p ON u.province_id = p.province_id
            GROUP BY u.province_id, p.province_name
            ORDER BY user_count DESC
            LIMIT 5
        `;
    const results = await queryDatabase(query);
    res.json(results);
  } catch (error) {
    console.error("Lỗi khi lấy thống kê người dùng theo tỉnh:", error);
    res
      .status(500)
      .json({ error: "Lỗi khi lấy thống kê người dùng theo tỉnh" });
  }
});

router.get("/api/users/registration-stats", async (req, res) => {
  try {
    const monthlyQuery = `
            SELECT YEAR(created_at) AS year, MONTH(created_at) AS month, COUNT(*) AS count
            FROM users 
            GROUP BY year, month
            ORDER BY year, month
        `;
    const weeklyQuery = `
            SELECT YEAR(created_at) AS year, WEEK(created_at, 1) AS week, COUNT(*) AS count
            FROM users 
            GROUP BY year, week
            ORDER BY year, week
        `;

    const dailyQuery = `
            SELECT DATE(created_at) AS date, COUNT(*) AS count
            FROM users 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `;

    const [monthlyResults, weeklyResults, dailyResults] = await Promise.all([
      queryDatabase(monthlyQuery),
      queryDatabase(weeklyQuery),
      queryDatabase(dailyQuery),
    ]);

    console.log("Daily Results:", dailyResults);

    res.json({
      monthly: monthlyResults,
      weekly: weeklyResults,
      daily: dailyResults,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thống kê đăng ký người dùng:", error);
    res.status(500).json({ error: "Lỗi khi lấy thống kê đăng ký người dùng" });
  }
});

module.exports = router; // Xuất router
