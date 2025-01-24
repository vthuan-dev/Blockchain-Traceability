document.addEventListener("DOMContentLoaded", () => {
  const profileIcon = document.getElementById("profileIcon");
  const dropdownMenu = document.querySelector(".dropdown-menu");
  const notificationPanel = document.querySelector(".notification-panel");
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.querySelector(".sidebar-toggle");
  const notificationList = document.getElementById("notificationList");
  const confirmReadButton = document.getElementById("confirmRead");
  const notificationIcon = document.getElementById("notificationIcon");
  const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000/api" : "http://www.tsroreee.com/api";

  // Toggle dropdown menu
  if (profileIcon && dropdownMenu) {
    profileIcon.addEventListener("click", () => {
      dropdownMenu.style.display =
        dropdownMenu.style.display === "none" ? "block" : "none";
    });
  }

  // Toggle notification panel và fetch notifications khi click vào icon
  if (notificationIcon && notificationPanel) {
    notificationIcon.addEventListener("click", () => {
      notificationPanel.classList.toggle("show");
      if (notificationPanel.classList.contains("show")) {
        fetchNotifications();
      }
    });
  }

  // Close dropdown or notification panel when clicking outside
  window.addEventListener("click", (e) => {
    if (
      !document.getElementById("notificationIcon").contains(e.target) &&
      !notificationPanel.contains(e.target)
    ) {
      notificationPanel.classList.remove("show");
    }
    if (!profileIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.style.display = "none";
    }
  });

  // Sidebar toggle button click
  sidebarToggle.addEventListener("click", toggleSidebar);

  // Close sidebar when clicking outside and reset toggle button position
  document.addEventListener("click", (event) => {
    if (
      !sidebar.contains(event.target) &&
      !sidebarToggle.contains(event.target)
    ) {
      sidebar.classList.remove("show");
      resetSidebarToggle();
    }
  });

  // Initialize clock
  time();

  // Fetch admin info and update section title
  fetchAdminInfo();

  // Fetch notifications ban đầu
  fetchNotifications();

  // Initialize WebSocket connection
  const socket = new WebSocket("ws://localhost:8080");

  socket.addEventListener("open", () => {
    console.log("WebSocket connection established");
  });

  socket.addEventListener("message", (event) => {
    try {
      const notification = JSON.parse(event.data);
      console.log("Đã nhận thông báo qua WebSocket:", notification); // Log thông báo để kiểm tra
      addNotificationToList(notification);
      updateNotificationCount();
    } catch (error) {
      console.error("Lỗi khi xử lý thông báo từ WebSocket:", error);
    }
  });

  socket.addEventListener("close", () => {
    console.log("WebSocket connection closed");
  });

  socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });

  // Xử lý nút đánh dấu đã đọc tất cả
  confirmReadButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (response.ok) {
        const notificationList = document.getElementById("notificationList");
        notificationList.innerHTML = ""; // Xóa tất cả thông báo khỏi giao diện
        updateNotificationCount(0);
      }
    } catch (error) {
      console.error("Lỗi khi xóa tất cả thông báo:", error);
    }
  });
});

// Hàm đánh dấu một thông báo đã đọc
async function markNotificationAsRead(notificationId) {
  try {
    const response = await fetch(`/api/notifications/${notificationId}/admin-read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      console.log("Đã xóa thông báo:", notificationId);
      return true;
    }
    console.error("Lỗi khi xóa thông báo:", await response.text());
    return false;
  } catch (error) {
    console.error("Lỗi khi xóa thông báo:", error);
    return false;
  }
}

// Function to fetch notifications
async function fetchNotifications() {
  try {
    const response = await fetch("/api/notifications");
    if (response.ok) {
      const notifications = await response.json();
      console.log("Thông báo nhận được từ API:", notifications); // Thêm log để kiểm tra
      const notificationList = document.getElementById("notificationList");
      notificationList.innerHTML = "";
      notifications.forEach(addNotificationToList);
      updateNotificationCount(notifications.filter((n) => !n.read).length);
    } else {
      console.error("Không thể lấy thông báo:", response.status);
    }
  } catch (error) {
    console.error("Lỗi khi lấy thông báo:", error);
  }
}

// Function to add a notification to the list
function addNotificationToList(notification) {
  const notificationList = document.getElementById("notificationList");
  const li = document.createElement("li");
  li.dataset.id = notification.notification_id;
  li.classList.add("notification-item");
  li.innerHTML = `
        <div class="notification-content">
            <p>${notification.message}</p>
            <small>${new Date(notification.created_on).toLocaleString(
              "vi-VN"
            )}</small>
        </div>
        <button class="mark-read-btn">
            <i class="fas fa-check"></i>
        </button>
    `;
  notificationList.prepend(li);

  // Thêm sự kiện click cho nút đánh dấu đã đọc
  const markReadBtn = li.querySelector(".mark-read-btn");
  markReadBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (await markNotificationAsRead(notification.notification_id)) {
      li.remove(); // Xóa thông báo khỏi giao diện
      updateNotificationCount(
        document.querySelectorAll("#notificationList .notification-item").length
      );
    }
  });

  console.log("Đã thêm thông báo:", notification.message); // Thêm log để kiểm tra
}

// Function to update notification count
function updateNotificationCount(count) {
  const badge = document.querySelector(".noti_count");
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = "inline";
    } else {
      badge.style.display = "none";
    }
  }
}

// Function to toggle sidebar and manage toggle button position
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const toggleButton = document.querySelector(".sidebar-toggle");

  sidebar.classList.toggle("show");

  if (sidebar.classList.contains("show")) {
    // When sidebar is open, fix the position of the toggle button
    toggleButton.style.position = "fixed";
    toggleButton.style.left = "200px";
    toggleButton.style.top = "80px"; // Adjust as needed
  } else {
    resetSidebarToggle();
  }
}

// Function to reset the sidebar toggle button to its original state
function resetSidebarToggle() {
  const toggleButton = document.querySelector(".sidebar-toggle");
  toggleButton.style.position = "";
  toggleButton.style.left = "";
  toggleButton.style.top = "";
}

// Clock function (unchanged)
function time() {
  const today = new Date();
  const weekday = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const day = weekday[today.getDay()];
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const h = String(today.getHours()).padStart(2, "0");
  const m = String(today.getMinutes()).padStart(2, "0");
  const s = String(today.getSeconds()).padStart(2, "0");
  const nowTime = `${h} giờ ${m} phút ${s} giây`;
  const currentDate = `${day}, ${dd}/${mm}/${yyyy}`;

  document.getElementById(
    "clock"
  ).innerHTML = `<span class="date">${currentDate} - ${nowTime}</span>`;
  setTimeout(time, 1000);
}

// Function to fetch admin info and update section title

async function fetchAdminInfo() {
  try {
    const response = await fetch("/api/admin-info");
    if (response.ok) {
      const data = await response.json();
      document.querySelector(
        ".section-title"
      ).textContent = `Xin chào, ${data.adminName}`;
    } else {
      console.error("Không thể lấy thông tin admin");
    }
  } catch (error) {
    console.error("Lỗi:", error);
  }
} 

function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

let deleteId = null;
let deleteType = null;

function showDeleteConfirmation(id, type) {
  deleteId = id;
  deleteType = type;
  document.querySelector(".remove").style.display = "block";
  document.getElementById("overlay").style.display = "block";
}

function hideDeleteConfirmation() {
  document.querySelector(".remove").style.display = "none";
  document.getElementById("overlay").style.display = "none";
  deleteId = null;
  deleteType = null;
}

document.getElementById("accept-remove").addEventListener("click", () => {
  if (deleteType === "product") deleteProduct(deleteId);
  if (deleteType === "user") deleteUser(deleteId);
  if (deleteType === "region") deleteRegion(deleteId); // Thêm dòng này
  hideDeleteConfirmation();
});

document
  .getElementById("cancel-remove")
  .addEventListener("click", hideDeleteConfirmation);

async function deleteItem(url, id) {
  try {
    const response = await fetch(`${url}/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Xóa thất bại");
    const data = await response.json();
    showMessage(
      `${
        url.includes("products") ? "Sản phẩm" : "Người dùng"
      } đã được xóa thành công!`,
      "success"
    );
    if (
      url.includes("products") &&
      typeof window.ProductManager.fetchProductData === "function"
    ) {
      window.ProductManager.fetchProductData();
    } else if (
      url.includes("users") &&
      typeof window.UserManager.fetchUserData === "function"
    ) {
      window.UserManager.fetchUserData();
    }
  } catch (error) {
    showMessage("Có lỗi xảy ra khi xóa: " + error.message, "error");
  }
}

function deleteProduct(productId) {
  fetch(`${baseUrl}/products/${productId}`, { method: "DELETE" })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Xóa thất bại");
      }
      return response.json();
    })
    .then((data) => {
      showMessage("Sản phẩm đã được xóa thành công!", "success");
      window.ProductManager.fetchProductData();
    })
    .catch((error) => {
      showMessage("Có lỗi xảy ra khi xóa: " + error.message, "error");
    });
}

function showMessage(message, type) {
  const messageContainer = document.getElementById("messageContainer");
  messageContainer.className = type;
  messageContainer.textContent = message;
  messageContainer.style.display = "block";
  setTimeout(() => {
    messageContainer.style.display = "none";
  }, 3000);
}

function deleteUser(userId) {
  deleteItem(`${baseUrl}/users`, userId);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function updatePagination(currentPage, rowsPerPage, filteredData) {
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  document.getElementById("currentPage").textContent = currentPage;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;

  const paginationInfo = document.querySelector(".pagination-info");
  if (paginationInfo) {
    paginationInfo.textContent = `Hiển thị kết quả từ mục ${
      (currentPage - 1) * rowsPerPage + 1
    } đến ${Math.min(currentPage * rowsPerPage, filteredData.length)}`;
  }
}

function showPanel(panel) {
  panel.style.display = "block";
  panel.classList.add("fade-in");
  document.getElementById("overlay").style.display = "block";
  document.querySelector("main").classList.add("disable-pointer");
}

function hidePanel(panel) {
  panel.classList.add("fade-out");
  setTimeout(() => {
    panel.style.display = "none";
    panel.classList.remove("fade-in", "fade-out");
    document.getElementById("overlay").style.display = "none";
    document.querySelector("main").classList.remove("disable-pointer");
  }, 300);
}
