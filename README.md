# Dự Án Truy Xuất Bưởi Bằng Blockchain

## Giới Thiệu

Dự án này là một hệ thống truy xuất bưởi  sử dụng công nghệ blockchain Ethereum. Hệ thống giúp quản lý quy trình kiểm định, chứng nhận chất lượng, và truy xuất nguồn gốc sản phẩm thông qua mã QR. 

## Công Nghệ Sử Dụng

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: MySQL
- **Blockchain**: Ethereum
- Sử dụng ngôn ngữ Solidity để viết blockchain

## Chức Năng Chính

### 1. Nông Dân
- **Đăng ký tài khoản và đăng nhập**: Xác minh danh tính qua email hoặc SMS.
- **Quản lý lô bưởi**: Nhập và cập nhật thông tin về các lô bưởi.
- **Yêu cầu xác thực**: Gửi yêu cầu kiểm định và chứng nhận chất lượng.
- **Tạo mã QR**: Sau khi được kiểm định, hệ thống sẽ tạo mã QR cho lô bưởi.

### 2. Người Tiêu Dùng
- **Quét mã QR**: Truy xuất nguồn gốc và kiểm tra chất lượng sản phẩm.
- **Đánh giá và phản hồi**: Gửi phản hồi về sản phẩm và hệ thống.

### 3. Nhà Kiểm Duyệt
- **Đăng ký tài khoản và đăng nhập**: Xác minh danh tính qua email hoặc SMS.
- **Kiểm định thông tin**: Xác minh thông tin và kiểm định chất lượng sản phẩm.
- **Cấp chứng nhận**: Cấp chứng nhận chất lượng và ghi nhận thông tin lên blockchain.
- **Quản lý yêu cầu xác thực**: Xử lý và cập nhật trạng thái yêu cầu kiểm định.

## Mô Hình Tương Tác

### Giao Diện Người Dùng

#### Nông Dân
- **Dashboard cá nhân**: Hiển thị các lô bưởi và trạng thái kiểm định.
- **Form nhập thông tin**: Nhập các thông tin về quy trình trồng trọt, thu hoạch và kiểm định.
- **Yêu cầu kiểm định**: Gửi yêu cầu và theo dõi trạng thái.

#### Người Tiêu Dùng
- **Quét mã QR**: Truy xuất thông tin sản phẩm.
- **Thông tin sản phẩm**: Hiển thị chi tiết về nguồn gốc và chất lượng sản phẩm.
- **Đánh giá và phản hồi**: Gửi đánh giá và phản hồi.

#### Nhà Kiểm Duyệt
- **Dashboard kiểm duyệt**: Quản lý các yêu cầu kiểm định.
- **Kiểm tra thông tin**: Xác minh thông tin quy trình trồng trọt, thu hoạch và kiểm định.
- **Cấp chứng nhận**: Ghi nhận kết quả kiểm định và cấp chứng nhận.

## Quy Trình Làm Việc

1. **Nông dân** đăng ký tài khoản và đăng nhập.
2. **Nông dân** nhập thông tin về lô bưởi và gửi yêu cầu kiểm định.
3. **Nhà kiểm duyệt** nhận yêu cầu, kiểm tra thông tin và thực hiện kiểm định.
4. **Nhà kiểm duyệt** cấp chứng nhận và hệ thống tạo mã QR.
5. **Người tiêu dùng** quét mã QR để truy xuất thông tin và đánh giá sản phẩm.

## Cách Sử Dụng

### Cài Đặt

1. **Clone dự án**:
    ```sh
    git clone https://github.com/LocNguyen807/NCKH.git
    ```

2. **Cài đặt các phụ thuộc**:
    ```sh
    npm install
    ```

3. **Cấu hình cơ sở dữ liệu**:
    - Tạo một cơ sở dữ liệu MySQL mới và nhập các bảng từ file `database.sql`.

4. **Chạy dự án**:
    ```sh
    npm start
    ```

### Sử Dụng

- **Nông dân**: Đăng ký tài khoản, nhập thông tin lô bưởi và gửi yêu cầu kiểm định.
- **Người tiêu dùng**: Quét mã QR để truy xuất thông tin sản phẩm.
- **Nhà kiểm duyệt**: Đăng nhập, kiểm định thông tin và cấp chứng nhận.


