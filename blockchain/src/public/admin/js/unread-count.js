function updateUnreadCount(count) {
  const replyCountElements = document.querySelectorAll(".reply-count");
  replyCountElements.forEach((element) => {
    element.textContent = count;
    element.style.display = count > 0 ? "inline-block" : "none";
  });

  // Cập nhật title của trang nếu có tin nhắn mới
  if (count > 0) {
    document.title = `(${count}) Tin nhắn mới`;
  } else {
    document.title = "Admin Dashboard";
  }

  // Lưu số lượng tin nhắn chưa đọc vào localStorage
  localStorage.setItem("unreadCount", count);
}

// Thêm hàm để lấy số lượng tin nhắn chưa đọc từ localStorage
function getUnreadCountFromStorage() {
  return parseInt(localStorage.getItem("unreadCount") || "0");
}

// Gọi hàm này khi trang được tải
document.addEventListener("DOMContentLoaded", () => {
  const storedCount = getUnreadCountFromStorage();
  updateUnreadCount(storedCount);
});
