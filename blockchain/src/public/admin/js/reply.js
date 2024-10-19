let selectedUser = {};
let users = [];
let messages = [];
let messageBody = "";
let unreadCount = 0;

// Lắng nghe sự kiện socketInitialized để đảm bảo socket đã sẵn sàng
document.addEventListener("socketInitialized", (e) => {
  // Khi trang được tải, kiểm tra thông tin đăng nhập và kết nối
  document.addEventListener("DOMContentLoaded", () => {
    if (window.socket) {
      window.socket.emit("requestUserList");
    } else {
      console.error("Socket chưa được khởi tạo");
    }
  });

  // Lắng nghe các sự kiện từ server
  window.socket.on("listUsers", (updatedUsers) => {
    users = updatedUsers;
    renderUserList();
  });

  window.socket.on("message", (data) => {
    if (selectedUser.name === data.from) {
      messages.push(data);
      renderMessages();
    } else {
      const user = users.find((user) => user.name === data.from);
      if (user) {
        user.unread = true;
        updateUserLastActiveTime(user.name);
        renderUserList();
      }
    }
  });

  window.socket.on("updateUser", (updatedUser) => {
    const userIndex = users.findIndex((u) => u.name === updatedUser.name);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updatedUser };
    } else {
      users.push(updatedUser);
    }
    renderUserList();
  });

  // Khi kết nối socket thành công
  window.socket.on("connect", () => {
    console.log("Kết nối socket thành công");
    // Yêu cầu danh sách người dùng từ server
    window.socket.emit("requestUserList");
  });

  // Lắng nghe sự kiện cập nhật danh sách người dùng từ server
  window.socket.on("updateUserList", (updatedUsers) => {
    users = updatedUsers;
    renderUserList();
  });

  // Lắng nghe sự kiện cập nhật trạng thái người dùng
  window.socket.on("updateUserStatus", (updatedUser) => {
    const userIndex = users.findIndex((user) => user.name === updatedUser.name);
    if (userIndex !== -1) {
      users[userIndex] = updatedUser;
      renderUserList();
    }
  });

  // Gọi renderUserList khi trang được tải
  document.addEventListener("DOMContentLoaded", () => {
    renderUserList();
  });
});

// Thêm hằng số cho thời gian không hoạt động tối đa (ví dụ: 1 ngày)
const MAX_INACTIVE_TIME = 24 * 60 * 60 * 1000;

// Sửa đổi hàm renderUserList
function renderUserList() {
  const userListElement = document.getElementById("userList");
  userListElement.innerHTML = "";
  unreadCount = 0;

  const currentTime = new Date().getTime();

  users
    .filter((x) => {
      return (
        x.name !== "Admin" &&
        x.roleId !== 3 &&
        x.messages &&
        x.messages.length > 0 &&
        currentTime - x.lastActiveTime <= MAX_INACTIVE_TIME
      ); // Chỉ hiển thị người dùng hoạt động gần đây
    })
    .forEach((user) => {
      const userItem = document.createElement("li");
      userItem.classList.add(
        "list-group-item",
        "d-flex",
        "justify-content-between",
        "align-items-center"
      );
      if (selectedUser.name === user.name) {
        userItem.classList.add("active");
      }
      userItem.textContent = user.name;

      const statusBadge = document.createElement("span");
      statusBadge.classList.add("badge");
      if (user.unread) {
        statusBadge.classList.add("badge-danger");
        statusBadge.textContent = "New";
        unreadCount++;
      } else if (user.online) {
        statusBadge.classList.add("badge-success");
        statusBadge.textContent = "Online";
      } else {
        statusBadge.classList.add("badge-secondary");
        statusBadge.textContent = "Offline";
      }
      userItem.appendChild(statusBadge);

      userItem.addEventListener("click", () => selectUser(user));
      userListElement.appendChild(userItem);
    });

  updateUnreadCount(unreadCount);
}

// Hàm để chọn người dùng
function selectUser(user) {
  selectedUser = user;
  messages = user.messages || [];
  user.unread = false;
  updateUserLastActiveTime(user.name);
  renderMessages();
  renderUserList();
  sendUnreadCountToServer(); // Gửi số lượng tin nhắn chưa đọc đến server
  window.socket.emit("onUserSelected", user);
}

// Hàm để render tin nhắn giữa admin và người dùng
function renderMessages() {
  const messageListElement = document.getElementById("messageList");
  messageListElement.innerHTML = "";

  if (messages.length === 0) {
    const noMessageItem = document.createElement("li");
    noMessageItem.textContent = "No messages";
    noMessageItem.classList.add("list-group-item");
    messageListElement.appendChild(noMessageItem);
  } else {
    messages.forEach((msg) => {
      const messageItem = document.createElement("li");
      messageItem.classList.add("list-group-item");
      // Hiển thị "Người dùng ẩn danh" cho tin nhắn từ người dùng
      const displayName =
        msg.from === selectedUser.name ? selectedUser.name : msg.from;
      messageItem.innerHTML = `<strong>${displayName}:</strong> ${msg.body}`;
      messageListElement.appendChild(messageItem);
    });
  }

  // Cuộn xuống cuối khi có tin nhắn mới
  messageListElement.scrollTop = messageListElement.scrollHeight;
}

// Gửi tin nhắn từ admin
function submitMessage() {
  const messageInput = document.getElementById("messageInput");
  const messageBody = messageInput.value.trim();

  if (!messageBody || !selectedUser.name) {
    showMessage("Vui lòng chọn người dùng và nhập tin nhắn", "warning");
    return;
  }

  const message = { body: messageBody, from: "Admin", to: selectedUser.name };
  messages.push(message);
  renderMessages();

  window.socket.emit("onMessage", message);

  messageInput.value = "";
}

// Gán sự kiện gửi tin nhắn khi form được submit
document.getElementById("messageForm").addEventListener("submit", (e) => {
  e.preventDefault();
  submitMessage();
});

// Thêm hàm để gửi số lượng tin nhắn chưa đọc đến server
function sendUnreadCountToServer() {
  if (window.socket) {
    window.socket.emit("updateNewCount", unreadCount);
  }
}

// Hàm để cập nhật số lượng tin nhắn chưa đọc
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

// Thêm hàm để cập nhật thời gian hoạt động cuối cùng của người dùng
function updateUserLastActiveTime(userName) {
  const userIndex = users.findIndex((user) => user.name === userName);
  if (userIndex !== -1) {
    users[userIndex].lastActiveTime = new Date().getTime();
  }
}
