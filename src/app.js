const express = require('express');
const bodyParser = require('body-parser');
const path = require('path'); // Thêm module path để xử lý đường dẫn
const app = express();
const dangkyRoutes = require('./components/user/dangky');
const dangnhapRoutes = require('./components/user/dangnhap'); // Import router đăng nhập

// Sử dụng body-parser để phân tích cú pháp JSON từ yêu cầu
app.use(bodyParser.json());

// Cấu hình đường dẫn tĩnh để phục vụ các tệp tĩnh
app.use(express.static(path.join(__dirname, 'public')));

// Sử dụng router đăng ký
app.use('/api', dangkyRoutes);

// Sử dụng router đăng nhập
app.use('/api', dangnhapRoutes);

//test

app.listen(3000, function() {
    console.log('Server is running on port 3000');
});