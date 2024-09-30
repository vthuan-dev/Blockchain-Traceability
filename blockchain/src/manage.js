const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { storage, ref, uploadBytes, getDownloadURL, authenticateAnonymously } = require('./firebase');

const router = express.Router(); // Sử dụng Router
router.use(cors()); // Cho phép CORS để client có thể gọi API
router.use(bodyParser.json());
router.use(express.urlencoded({ extended: true })); // Thêm middleware để xử lý dữ liệu URL-encoded

// Cấu hình multer để sử dụng bộ nhớ tạm thời
const upload = multer({ storage: multer.memoryStorage() });
const db = require('./config/db.js');

// Utility function để chuyển đổi callback thành Promise
const promisify = (fn) => (...args) => {
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
        console.error('Lỗi khi truy vấn dữ liệu:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Endpoint để lấy thông tin người dùng
router.get('/api/users', async (req, res) => {
    try {
        const query = 'SELECT * FROM users';
        const results = await queryDatabase(query, []);
        res.json(results);
    } catch (error) {
        console.error('Lỗi khi truy vấn dữ liệu:', error);
        res.status(500).send('Lỗi khi truy vấn dữ liệu');
    }
});

// Endpoint để lấy thông tin sản phẩm
router.get('/api/theproducts', async (req, res) => {
    try {
        const query = 'SELECT * FROM products';
        const results = await queryDatabase(query, []);
        res.json(results);
    } catch (error) {
        console.error('Lỗi khi truy vấn dữ liệu:', error);
        res.status(500).send('Lỗi khi truy vấn dữ liệu');
    }
});

// Thêm endpoint mới để xử lý việc thêm sản phẩm
router.post('/api/products', upload.single('img'), async (req, res) => {
    try {
        await authenticateAnonymously();

        const { product_name, price, description, uses, process } = req.body;
        const img = req.file;

        console.log('Dữ liệu nhận được từ client:', req.body, req.file);

        if (!product_name || !price || !description || !img || !uses || !process) {
            return res.status(400).json({ error: 'Thiếu thông tin sản phẩm' });
        }

        let imgUrl = null;
        if (img) {
            try {
                const sanitizedFileName = img.originalname.replace(/\s+/g, '_').toLowerCase();
                const imgRef = ref(storage, `products/${Date.now()}_${sanitizedFileName}`);
                console.log('Đang tải lên Firebase:', imgRef.fullPath);
                const snapshot = await uploadBytes(imgRef, img.buffer);
                imgUrl = await getDownloadURL(snapshot.ref);
                console.log('URL hình ảnh sau khi tải lên:', imgUrl);
                
                // Thêm một khoảng thời gian chờ ngắn
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Lưu vào cơ sở dữ liệu
                const query = 'INSERT INTO products (product_name, price, description, img, uses, process) VALUES (?, ?, ?, ?, ?, ?)';
                const results = await queryDatabase(query, [product_name, price, description, imgUrl, uses, process]);
                console.log('Kết quả sau khi thêm vào cơ sở dữ liệu:', results);
                
                // Kiểm tra URL đã lưu
                const checkQuery = 'SELECT img FROM products WHERE product_id = ?';
                const [savedProduct] = await queryDatabase(checkQuery, [results.insertId]);
                console.log('URL đã lưu trong cơ sở dữ liệu:', savedProduct.img);
                
                res.status(201).json({ message: 'Sản phẩm đã được thêm thành công', id: results.insertId, imgUrl: imgUrl });
            } catch (uploadError) {
                console.error('Lỗi khi tải lên Firebase:', uploadError);
                return res.status(500).json({ error: 'Lỗi khi tải lên hình ảnh' });
            }
        }
    } catch (error) {
        console.error('Lỗi khi xử lý yêu cầu thêm sản phẩm:', error);
        res.status(500).json({ error: 'Lỗi khi xử lý yêu cầu thêm sản phẩm' });
    }
});
// Endpoint để xóa sản phẩm
router.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = 'DELETE FROM products WHERE product_id = ?';
        const results = await queryDatabase(query, [id]);
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        }
        res.status(200).json({ message: 'Sản phẩm đã được xóa thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa sản phẩm:', error);
        res.status(500).json({ error: 'Lỗi khi xóa sản phẩm' });
    }
});

// Endpoint để xóa người dùng
router.delete('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Xóa các hàng liên quan trong bảng register
        await connection.query('DELETE FROM register WHERE actor_id = ?', [userId]);

        // Xóa các hàng liên quan trong bảng notification_change
        await connection.query('DELETE FROM notification_change WHERE actor_id = ?', [userId]);

        // Xóa các hàng liên quan trong bảng notification
        await connection.query('DELETE FROM notification WHERE user_id = ?', [userId]);

        // Xóa người dùng
        await connection.query('DELETE FROM users WHERE uid = ?', [userId]);

        await connection.commit();
        res.status(200).json({ message: 'Người dùng đã được xóa thành công' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Lỗi khi xóa người dùng:', error);
        res.status(500).json({ message: 'Lỗi khi xóa người dùng', error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Cấu hình để phục vụ các tệp tĩnh
router.use(express.static(path.join(__dirname, 'public')));

// Route để phục vụ tệp user.html
router.get('/user.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'user.html'));
});

router.get('/product', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'product.html'));
});

router.get('/admin', (req, res) => {   
    res.sendFile(path.join(__dirname, 'public', 'admin', 'admintest.html'));
})

router.get('/caidat', (req, res) => {   
    res.sendFile(path.join(__dirname, 'public', 'admin', 'caidat.html'));
})

// Endpoint để cập nhật sản phẩm
router.post('/api/products/update', upload.single('img'), async (req, res) => {
    try {
        await authenticateAnonymously(); // Sử dụng auth từ cấu hình Firebase

        console.log('Dữ liệu nhận được:', req.body, req.file);

        const { product_id, product_name, price, description, uses, process } = req.body;
        
        let updateFields = [];
        let updateValues = [];

        if (product_name) {
            updateFields.push('product_name = ?');
            updateValues.push(product_name);
        }
        if (price) {
            updateFields.push('price = ?');
            updateValues.push(price);
        }
        if (description) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        if (uses) {
            updateFields.push('uses = ?');
            updateValues.push(uses);
        }
        if (process) {
            updateFields.push('process = ?');
            updateValues.push(process);
        }

        if (req.file) {
            const imgRef = ref(storage, `products/${Date.now()}_${req.file.originalname}`);
            const snapshot = await uploadBytes(imgRef, req.file.buffer);
            const imgUrl = await getDownloadURL(snapshot.ref);
            updateFields.push('img = ?');
            updateValues.push(imgUrl);
        }

        if (updateFields.length > 0) {
            const updateQuery = `UPDATE products SET ${updateFields.join(', ')} WHERE product_id = ?`;
            updateValues.push(product_id);

            console.log('Query cập nhật:', updateQuery);
            console.log('Giá trị cập nhật:', updateValues);

            queryDatabase(updateQuery, updateValues, (error, results) => {
                if (error) {
                    console.error('Lỗi khi cập nhật sản phẩm:', error);
                    return res.status(500).json({ error: 'Lỗi khi cập nhật sản phẩm' });
                }
                res.json({ message: 'Sản phẩm đã được cập nhật thành công', updated: true });
            });
        } else {
            console.log('Không có thay đổi nào được cập nhật');
            res.json({ message: 'Không có thay đổi nào cần được cập nhật', updated: false });
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật sản phẩm:', error);
        res.status(500).json({ error: 'Lỗi khi cập nhật sản phẩm' });
    }
});

// Cập nhật endpoint tạo admin mới
router.post('/api/admin', async (req, res) => {
    const { email, name, password, province_id } = req.body;

    if (!email || !name || !password) {
        return res.status(400).json({ error: 'Thiếu thông tin admin' });
    }

    try {
        const hashedPassword = await promisify(bcrypt.hash)(password, 10);
        const query = 'INSERT INTO admin (admin_email, admin_name, admin_pass, role_id, province_id) VALUES (?, ?, ?, ?, ?)';
        const results = await queryDatabase(query, [email, name, hashedPassword, 3, province_id]);
        res.status(201).json({ message: 'Admin đã được thêm thành công', id: results.insertId });
    } catch (error) {
        console.error('Lỗi khi thêm admin:', error);
        res.status(500).json({ error: 'Lỗi khi thêm admin' });
    }
});

// Cập nhật endpoint lấy thông tin tỉnh
router.get('/api/province/:id', async (req, res) => {
    const { id } = req.params;
    const query = 'SELECT province_name FROM provinces WHERE province_id = ?';
    try {
        const results = await queryDatabase(query, [id]);
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Không tìm thấy tỉnh' });
        }
    } catch (error) {
        console.error('Lỗi khi truy vấn dữ liệu:', error);
        res.status(500).json({ error: 'Lỗi khi truy vấn dữ liệu' });
    }
});


// Endpoint để lấy thông tin session
router.get('/api/session', (req, res) => {
    const provinceId = req.session.province_id; // Giả sử bạn lưu province_id trong session
    if (!provinceId) {
        return res.status(400).json({ error: 'Không tìm thấy province_id trong session' });
    }
    res.json({ province_id: provinceId });
});

router.get('/api/districts/:provinceCode', async (req, res) => {
    try {
        console.log('Đang gọi API districts cho tỉnh:', req.params.provinceCode);
        const response = await axios.get(`https://provinces.open-api.vn/api/p/${req.params.provinceCode}?depth=2`);
        const districts = response.data.districts.map(d => ({ district_id: d.code, district_name: d.name }));
        console.log('Kết quả API districts:', districts);
        res.json(districts);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách quận/huyện:', error);
        res.status(500).json({ error: 'Lỗi khi lấy danh sách quận/huyện' });
    }
});

router.get('/api/wards/:districtCode', async (req, res) => {
    try {
        console.log('Đang xử lý yêu cầu wards cho quận/huyện:', req.params.districtCode);
        const response = await axios.get(`https://provinces.open-api.vn/api/d/${req.params.districtCode}?depth=2`);
        const wards = response.data.wards.map(w => ({ ward_id: w.code, ward_name: w.name }));
        console.log('Kết quả API wards:', wards);
        res.json(wards);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách xã/phường:', error);
        res.status(500).json({ error: 'Lỗi khi lấy danh sách xã/phường' });
    }
});

// Cập nhật endpoint thêm vùng sản xuất mới
router.post('/api/regions', async (req, res) => {
    const { province_id, district_id, region_name, ward_name, district_name } = req.body;

    if (!province_id || !district_id || !region_name || !ward_name) {
        return res.status(400).json({ error: 'Thiếu thông tin vùng sản xuất' });
    }

    try {
        const queryMaxId = 'SELECT MAX(region_id) AS max_id FROM regions WHERE region_id LIKE ?';
        const regionPrefix = `${province_id}${district_id}%`;
        const results = await queryDatabase(queryMaxId, [regionPrefix]);

        let newRegionId;
        if (results[0].max_id) {
            const maxId = results[0].max_id;
            const currentNumber = parseInt(maxId.slice(-3), 10);
            newRegionId = `${province_id}${district_id}${String(currentNumber + 1).padStart(3, '0')}`;
        } else {
            newRegionId = `${province_id}${district_id}001`;
        }

        const queryInsert = 'INSERT INTO regions (region_id, region_name, ward_name, district_name) VALUES (?, ?, ?, ?)';
        await queryDatabase(queryInsert, [newRegionId, region_name, ward_name, district_name]);
        res.status(201).json({ success: true, message: 'Vùng sản xuất đã được thêm thành công' });
    } catch (error) {
        console.error('Lỗi khi thêm vùng sản xuất:', error);
        res.status(500).json({ error: 'Lỗi khi thêm vùng sản xuất' });
    }
});

// Cập nhật endpoint lấy danh sách vùng sản xuất
router.get('/api/regions', async (req, res) => {
    const adminProvinceId = req.query.province_id;

    if (!adminProvinceId) {
        return res.status(400).json({ error: 'Thiếu mã tỉnh của admin' });
    }

    const query = 'SELECT * FROM regions WHERE LEFT(region_id, 2) = ?';
    
    try {
        const results = await queryDatabase(query, [adminProvinceId]);
        res.json(results);
    } catch (error) {
        console.error('Lỗi khi truy vấn dữ liệu:', error);
        res.status(500).json({ error: 'Lỗi khi truy vấn dữ liệu' });
    }
});

// Cập nhật endpoint xóa vùng sản xuất
router.delete('/api/regions/:id', async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM regions WHERE region_id = ?';
    try {
        await queryDatabase(query, [id]);
        res.status(200).json({ message: 'Vùng sản xuất đã được xóa thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa vùng sản xuất:', error);
        res.status(500).json({ error: 'Lỗi khi xóa vùng sản xuất' });
    }
});

module.exports = router; // Xuất router