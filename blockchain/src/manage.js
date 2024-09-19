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

// Tạo pool kết nối
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'database-1.cv20qo0q8bre.ap-southeast-2.rds.amazonaws.com',
    user: 'admin',
    password: '9W8RQuAdnZylXZAmb68P',
    database: 'blockchain'
});

// Hàm để thực hiện truy vấn
function queryDatabase(query, params, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Lỗi khi lấy kết nối từ pool:', err);
            callback(err, null);
            return;
        }

        connection.query(query, params, (error, results) => {
            connection.release(); // Trả lại kết nối vào pool

            if (error) {
                console.error('Lỗi khi truy vấn dữ liệu:', error);
                callback(error, null);
                return;
            }

            callback(null, results);
        });
    });
}

// Endpoint để lấy thông tin người dùng
router.get('/api/users', (req, res) => {
    const query = 'SELECT * FROM users';
    queryDatabase(query, [], (error, results) => {
        if (error) {
            console.error('Lỗi khi truy vấn dữ liệu: ' + error.stack);
            res.status(500).send('Lỗi khi truy vấn dữ liệu');
            return;
        }
        res.json(results);
    });
});

router.get('/api/theproducts', (req, res) => {
    const query = 'SELECT * FROM products';
    queryDatabase(query, [], (error, results) => {
        if (error) {
            console.error('Lỗi khi truy vấn dữ liệu: ' + error.stack);
            res.status(500).send('Lỗi khi truy vấn dữ liệu');
            return;
        }
        // Đảm bảo rằng trường img chứa URL đầy đủ của ảnh
        const productsWithFullImageUrl = results.map(product => ({
            ...product,
            img: product.img ? product.img : 'path/to/default-product-image.png'
        }));
        res.json(productsWithFullImageUrl);
    });
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
            const imgRef = ref(storage, `products/${Date.now()}_${img.originalname}`);
            const snapshot = await uploadBytes(imgRef, img.buffer);
            imgUrl = await getDownloadURL(snapshot.ref);
        }

        const query = 'INSERT INTO products (product_name, price, description, img, uses, process) VALUES (?, ?, ?, ?, ?, ?)';
        queryDatabase(query, [product_name, price, description, imgUrl, uses, process], (error, results) => {
            if (error) {
                console.error('Lỗi khi thêm sản phẩm: ' + error.stack);
                return res.status(500).json({ error: 'Lỗi khi thêm sản phẩm' });
            }
            res.status(201).json({ message: 'Sản phẩm đã được thêm thành công', id: results.insertId });
        });
    } catch (error) {
        console.error('Lỗi khi thêm sản phẩm:', error);
        res.status(500).json({ error: 'Lỗi khi thêm sản phẩm' });
    }
});

// Endpoint để xóa sản phẩm
router.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM products WHERE product_id = ?';
    queryDatabase(query, [id], (error, results) => {
        if (error) {
            console.error('Lỗi khi xóa sản phẩm: ' + error.stack);
            return res.status(500).json({ error: 'Lỗi khi xóa sản phẩm' });
        }
        res.status(200).json({ message: 'Sản phẩm đã được xóa thành công' });
    });
});

// Endpoint để xóa người dùng
router.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM users WHERE uid = ?';
    queryDatabase(query, [id], (error, results) => {
        if (error) {
            console.error('Lỗi khi xóa người dùng: ' + error.stack);
            return res.status(500).json({ error: 'Lỗi khi xóa người dùng' });
        }
        res.status(200).json({ message: 'Người dùng đã được xóa thành công' });
    });
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
        await authenticateAnonymously();

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

// Thêm endpoint để tạo admin mới
router.post('/api/admin', (req, res) => {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
        return res.status(400).json({ error: 'Thiếu thông tin admin' });
    }

    // Mã hóa mật khẩu
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Lỗi khi mã hóa mật khẩu:', err);
            return res.status(500).json({ error: 'Lỗi khi tạo admin' });
        }

        const query = 'INSERT INTO admin (admin_email, admin_name, admin_pass, role_id) VALUES (?, ?, ?, ?)';
        queryDatabase(query, [email, name, hashedPassword, 3], (error, results) => {
            if (error) {
                console.error('Lỗi khi thêm admin:', error);
                return res.status(500).json({ error: 'Lỗi khi thêm admin' });
            }
            res.status(201).json({ message: 'Admin đã được thêm thành công', id: results.insertId });
        });
    });
});

// Endpoint để lấy thông tin tỉnh dựa trên province_id
router.get('/api/province/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT province_name FROM provinces WHERE province_id = ?';
    queryDatabase(query, [id], (error, results) => {
        if (error) {
            console.error('Lỗi khi truy vấn dữ liệu: ' + error.stack);
            return res.status(500).json({ error: 'Lỗi khi truy vấn dữ liệu' });
        }
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Không tìm thấy tỉnh' });
        }
    });
});

// Endpoint để lấy thông tin session
router.get('/api/session', (req, res) => {
    const provinceId = req.session.province_id; // Giả sử bạn lưu province_id trong session
    if (!provinceId) {
        return res.status(400).json({ error: 'Không tìm thấy province_id trong session' });
    }
    res.json({ province_id: provinceId });
});

// Endpoint để lấy danh sách quận/huyện từ API
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

// Endpoint để lấy danh sách xã/phường từ API
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

// Endpoint để thêm vùng sản xuất mới
router.post('/api/regions', (req, res) => {
    const { province_id, district_id, region_name, ward_name, district_name } = req.body;

    if (!province_id || !district_id || !region_name || !ward_name) {
        return res.status(400).json({ error: 'Thiếu thông tin vùng sản xuất' });
    }

    // Tạo region_id
    const queryMaxId = 'SELECT MAX(region_id) AS max_id FROM regions WHERE region_id LIKE ?';
    const regionPrefix = `${province_id}${district_id}%`;

    queryDatabase(queryMaxId, [regionPrefix], (error, results) => {
        if (error) {
            console.error('Lỗi khi tìm mã vùng lớn nhất:', error);
            return res.status(500).json({ error: 'Lỗi khi tìm mã vùng lớn nhất' });
        }

        let newRegionId;
        if (results[0].max_id) {
            const maxId = results[0].max_id;
            const currentNumber = parseInt(maxId.slice(-3), 10);
            newRegionId = `${province_id}${district_id}${String(currentNumber + 1).padStart(3, '0')}`;
        } else {
            newRegionId = `${province_id}${district_id}001`;
        }

        const queryInsert = 'INSERT INTO regions (region_id, region_name, ward_name, district_name) VALUES (?, ?, ?, ?)';
        queryDatabase(queryInsert, [newRegionId, region_name, ward_name, district_name], (error, results) => {
            if (error) {
                console.error('Lỗi khi thêm vùng sản xuất:', error);
                return res.status(500).json({ error: 'Lỗi khi thêm vùng sản xuất' });
            }
            res.status(201).json({ success: true, message: 'Vùng sản xuất đã được thêm thành công' });
        });
    });
});

// Endpoint để lấy danh sách vùng sản xuất
router.get('/api/regions', (req, res) => {
    const adminProvinceId = req.query.province_id;

    if (!adminProvinceId) {
        return res.status(400).json({ error: 'Thiếu mã tỉnh của admin' });
    }

    // Sửa đổi câu truy vấn để chỉ lấy các vùng có 2 chữ số đầu của region_id trùng với adminProvinceId
    const query = 'SELECT * FROM regions WHERE LEFT(region_id, 2) = ?';
    
    queryDatabase(query, [adminProvinceId], (error, results) => {
        if (error) {
            console.error('Lỗi khi truy vấn dữ liệu: ' + error.stack);
            return res.status(500).json({ error: 'Lỗi khi truy vấn dữ liệu' });
        }
        res.json(results);
    });
});

// Endpoint để xóa vùng sản xuất
router.delete('/api/regions/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM regions WHERE region_id = ?';
    queryDatabase(query, [id], (error, results) => {
        if (error) {
            console.error('Lỗi khi xóa vùng sản xuất: ' + error.stack);
            return res.status(500).json({ error: 'Lỗi khi xóa vùng sản xuất' });
        }
        res.status(200).json({ message: 'Vùng sản xuất đã được xóa thành công' });
    });
});

module.exports = router; // Xuất router