# Dự Án Truy Xuất Nguồn Gốc Bưởi Bằng Blockchain

## Giới Thiệu

Dự án này là một hệ thống truy xuất nguồn gốc bưởi sử dụng công nghệ blockchain Ethereum. Hệ thống giúp quản lý quy trình sản xuất, kiểm định, chứng nhận chất lượng, và truy xuất nguồn gốc sản phẩm thông qua mã QR. Mục tiêu chính là tăng cường tính minh bạch và đáng tin cậy trong chuỗi cung ứng bưởi.

## Công Nghệ Sử Dụng

- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Blockchain**: Solidity (for smart contracts)
- **Ethereum**: Ethereum (for blockchain network)
- **Authentication**: JWT, Session-based (express-session)
- **Chat & notification**: Socket.io
- **Other**: Web3.js, Multer (file upload), Nodemailer (email verification)
- **Tools**: Truffle, Ganache, MetaMask
- **Storage**: Firebase, AWS S3, IPFS Filebase
- **Testnet** : Sepolia

## Chức Năng Chính

### 1. Quản lý Người Dùng
- Đăng ký tài khoản (nông dân, nhà kiểm duyệt)
- Đăng nhập/Đăng xuất
- Xác minh email
- Quản lý thông tin cá nhân

### 2. Quản lý Lô Bưởi (Nông Dân)
- Tạo lô bưởi mới
- Cập nhật thông tin lô bưởi
- Xem danh sách lô bưởi
- Gửi yêu cầu kiểm định

### 3. Kiểm Định và Chứng Nhận (Nhà Kiểm Duyệt)
- Xem danh sách yêu cầu kiểm định
- Xác minh thông tin và kiểm định chất lượng
- Phê duyệt hoặc từ chối lô bưởi
- Cấp chứng nhận chất lượng

### 4. Truy Xuất Nguồn Gốc (Người Tiêu Dùng)
- Quét mã QR để xem thông tin sản phẩm
- Xem chi tiết về nguồn gốc và chất lượng sản phẩm
- Gửi đánh giá và phản hồi

### 5. Quản lý Hoạt Động
- Ghi nhận các hoạt động liên quan đến lô hàng
- Xem nhật ký hoạt động

## Cài Đặt và Chạy Dự Án

1. Clone dự án:
   ```sh
   git clone https://github.com/vthuan-dev/nckh-be.git
   cd nckh-be
   ```

2. Cài đặt dependencies:
   ```sh
   npm install
   ```

3. Cấu hình môi trường:
   - Tạo file `.env` trong thư mục gốc và cấu hình các biến môi trường:
     ```sh
     DB_HOST=your_database_host
     DB_USER=your_database_user
     DB_PASSWORD=your_database_password
     DB_DATABASE=your_database_name
     SESSION_SECRET=your_session_secret
     AWS_ACCESS_KEY_ID=your_aws_access_key
     AWS_SECRET_ACCESS_KEY=your_aws_secret_key
     BUCKET_NAME=your_s3_bucket_name
     ```

4. Khởi tạo cơ sở dữ liệu:
   - Tạo database MySQL
   - Import schema từ file `database.sql` (nếu có)

5. Triển khai smart contract:
   - Cài đặt Truffle: `npm install -g truffle`
   - Di chuyển vào thư mục blockchain: `cd blockchain`
   - Triển khai contract: `truffle migrate --network <your_network>`

6. Chạy dự án:
   - Môi trường phát triển: `npm run dev`
   - Môi trường sản xuất: `npm start`

## Cấu Trúc Dự Án

```
nckh-be/
├── blockchain/
│   ├── contracts/
│   │   └── TraceabilityContract.sol
│   ├── migrations/
│   └── truffle-config.js
├── src/
│   ├── public/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   ├── components/
│   │   └── user/
│   │       ├── dangky.js
│   │       └── dangnhap.js
│   ├── config/
│   │   └── db.js
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   └── server.js
├── .env
├── package.json
└── README.md
```

## API Endpoints

- `/api/register`: Đăng ký người dùng mới
- `/api/login`: Đăng nhập
- `/api/logout`: Đăng xuất
- `/api/batches`: CRUD operations cho lô hàng
- `/api/inspection`: Yêu cầu và xử lý kiểm định
- `/api/qr`: Tạo và quét mã QR
- `/api/activities`: Quản lý nhật ký hoạt động
- `/api/products`: Lấy danh sách sản phẩm

## Quy Trình Làm Việc

1. Nông dân đăng ký tài khoản và đăng nhập.
2. Nông dân tạo lô bưởi mới và nhập thông tin chi tiết.
3. Nông dân gửi yêu cầu kiểm định cho lô bưởi.
4. Nhà kiểm duyệt đăng nhập và xem danh sách yêu cầu kiểm định.
5. Nhà kiểm duyệt thực hiện kiểm định và cập nhật kết quả.
6. Nếu được phê duyệt, hệ thống tạo mã QR cho lô bưởi.
7. Người tiêu dùng quét mã QR để xem thông tin và đánh giá sản phẩm.

## Bảo Mật

- Sử dụng bcrypt để mã hóa mật khẩu
- Xác thực người dùng thông qua session
- Sử dụng HTTPS cho môi trường sản xuất
- Xử lý và validate input từ người dùng

## Đóng Góp

Nếu bạn muốn đóng góp vào dự án, vui lòng tạo pull request hoặc báo cáo issues trên GitHub.

## Giấy Phép



## Liên Hệ

Để biết thêm thông tin, vui lòng liên hệ: [https://www.facebook.com/vthuan.dev]
