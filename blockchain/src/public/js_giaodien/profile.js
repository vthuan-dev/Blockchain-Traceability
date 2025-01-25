import { loadNotifications as loadProducerNotifications } from './thongbaoNSX.js';
import { loadNotifications as loadInspectorNotifications } from './thongbaoNKD.js';

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("/api/user-info");
    if (response.ok) {
      const data = await response.json();
      const roleId = data.roleId; // Lấy roleId từ dữ liệu người dùng
      const navItems = document.getElementById("navItems");
      const navbarBrand = document.querySelector(".navbar-brand");
      const brandSpan = navbarBrand.querySelector("span");

      // Xóa các mục điều hướng hiện tại
      navItems.innerHTML = "";

      // Thêm các mục điều hướng dựa trên roleId
      if (roleId === 1) {
        // Người sản xuất
        navbarBrand.setAttribute("href", "./san-xuat/sanxuat.html");
        brandSpan.textContent = "Sản xuất";
        navItems.innerHTML += `
                    <li class="nav-item"><a class="nav-link" href="./san-xuat/sanxuat.html">Quản lí lô hàng</a></li>
                    <li class="nav-item"><a class="nav-link" href="./san-xuat/nhatky-hoatdong.html">Quản lí hoạt động</a></li>
                    <li class="nav-item dropdown" style="position: relative;">
                        <a class="nav-link dropdown-toggle" href="#" id="notificationDropdown" role="button" data-toggle="dropdown">
                            <i class="fas fa-bell"></i>
                            <span class="badge badge-danger" id="notification-count">0</span>
                        </a>
                        <div class="dropdown-menu notification-menu" aria-labelledby="notificationDropdown">
                            <div class="notification-header">
                                <h6 class="dropdown-header">Thông báo</h6>
                                <button class="btn btn-sm" id="markAllRead">
                                    <i class="fas fa-check-double mr-1"></i>
                                    Đánh dấu tất cả đã đọc
                                </button>
                            </div>
                            <div class="notification-list" id="notificationList">
                                <!-- Notifications will be inserted here   -->
                            </div>
                        </div>
                    </li>
                `;

        // Gọi trực tiếp hàm load thông báo
        loadProducerNotifications();
      } else if (roleId === 2) {
        // Người kiểm duyệt
        navbarBrand.setAttribute("href", "../kiem-duyet/nhakiemduyet.html");
        brandSpan.textContent = "Nhà kiểm duyệt";
        navItems.innerHTML += `
                    <li class="nav-item"><a class="nav-link" href="../kiem-duyet/nhakiemduyet.html">Quản lí lô hàng</a></li>
                    <li class="nav-item"><a class="nav-link" href="../kiem-duyet/nhatky-hoatdong.html">Quản lí hoạt động</a></li>
                    <li class="nav-item dropdown" style="position: relative;">
                        <a class="nav-link dropdown-toggle" href="#" id="notificationDropdown" role="button" data-toggle="dropdown">
                            <i class="fas fa-bell"></i>
                            <span class="badge badge-danger" id="notification-count">0</span>
                        </a>
                        <div class="dropdown-menu notification-menu" aria-labelledby="notificationDropdown">
                            <div class="notification-header">
                                <h6 class="dropdown-header">Thông báo</h6>
                                <button class="btn btn-sm" id="markAllRead">
                                    <i class="fas fa-check-double mr-1"></i>
                                    Đánh dấu tất cả đã đọc
                                </button>
                            </div>
                            <div class="notification-list" id="notificationList">
                                <!-- Notifications will be inserted here   -->
                            </div>
                        </div>
                    </li>
                `;

        // Gọi trực tiếp hàm load thông báo
        loadInspectorNotifications();
      } else if (roleId === 3) {
        // Admin
        navItems.innerHTML += `
                    <li class="nav-item"><a class="nav-link" href="../admin/dashboard.html">Bảng điều khiển</a></li>
                    <li class="nav-item"><a class="nav-link" href="../admin/users.html">Quản lí người dùng</a></li>
                `;
      } else if (roleId === 6 || roleId === 8) {
        // Người vận chuyển hoặc Nhà kho
        navbarBrand.setAttribute("href", "./van-chuyen/van-chuyen.html");
        brandSpan.textContent = roleId === 6 ? "Vận chuyển" : "Nhà kho";
        navItems.innerHTML += `
                    <li class="nav-item"><a class="nav-link" href="./van-chuyen/van-chuyen.html">Quản lí lô hàng</a></li>
                    <li class="nav-item"><a class="nav-link" href="#">Quản lí hoạt động</a></li>
                    <li class="nav-item"><a class="nav-link" href="#">Thông báo</a></li>
                `;
      }

      // Ẩn vùng sản xuất cho vai trò vận chuyển và nhà kho
      const productionArea = document.getElementById("productionArea");
      const regionInput = document.getElementById("regionInput");
      if (
        roleId === 6 ||
        roleId === 8 ||
        data.region === null ||
        data.region === "null" ||
        data.region === ""
      ) {
        if (productionArea) {
          productionArea.style.display = "none";
        }
        if (regionInput) {
          regionInput.closest(".form-group").style.display = "none";
        }
      } else {
        if (productionArea) {
          productionArea.style.display = "block";
        }
        if (regionInput) {
          regionInput.closest(".form-group").style.display = "block";
        }
      }

      const userRegionContainer = document.getElementById(
        "userRegionContainer"
      );
      const userRegion = document.getElementById("userRegion");

      if (
        data.region === null ||
        data.region === "null" ||
        data.region === ""
      ) {
        userRegionContainer.style.display = "none";
      } else {
        userRegion.textContent = `Khu vực: ${data.region}`;
        userRegionContainer.style.display = "block";
      }
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || "Không thể lấy thông tin người dùng");
    }
  } catch (error) {
    console.error("Lỗi:", error.message);
    alert(
      "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại."
    );
    window.location.href = "../account/dangnhap.html";
  }
});
function hasDataChanged() {
  const name = document.getElementById("userNameInput");
  const phone = document.getElementById("phoneInput");
  const address = document.getElementById("addressInput");
  const dob = document.getElementById("dobInput");
  const gender = document.getElementById("genderInput");
  const avatarInput = document.getElementById("imageUpload");

  return (
    name.value !== name.defaultValue ||
    phone.value !== phone.defaultValue ||
    address.value !== address.defaultValue ||
    dob.value !== dob.defaultValue ||
    gender.value !== gender.defaultValue ||
    avatarInput.files.length > 0
  );
}


