// Khởi tạo socket.io và các biến dùng để quản lý trạng thái
let socket = null;
let selectedUser = {};
let users = [];
let messages = [];
let messageBody = "";

// Kết nối Socket.IO
const ENDPOINT = window.location.host.indexOf("localhost") >= 0 ? "http://127.0.0.1:3000" : window.location.host;
socket = io(ENDPOINT);

// Hàm để lấy thông tin người dùng đã đăng nhập
function getUserInfo() {
    return fetch('/api/user-info')  
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.roleId === 3) {
                return { name: data.name, roleId: data.roleId };
            } else {
                throw new Error('Người dùng không phải là admin');
            }
        });
}

// Khi trang được tải, kiểm tra thông tin đăng nhập và kết nối
document.addEventListener('DOMContentLoaded', () => {
    getUserInfo()
        .then(userInfo => {
            console.log('Admin đã đăng nhập:', userInfo);
            socket.emit("onLogin", userInfo);
        })
        .catch(error => {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            // Có thể chuyển hướng người dùng đến trang đăng nhập ở đây
            // window.location.href = '/login.html';
        });
});

// Lắng nghe các sự kiện từ server
socket.on("listUsers", (updatedUsers) => {
    users = updatedUsers;
    renderUserList();
});

socket.on("message", (data) => {
    if (selectedUser.name === data.from) {
        messages.push(data);
        renderMessages();
    } else {
        const user = users.find((user) => user.name === data.from);
        if (user) {
            user.unread = true;
            renderUserList();
        }
    }
});

socket.on("updateUser", (updatedUser) => {
    const userIndex = users.findIndex(u => u.name === updatedUser.name);
    if (userIndex !== -1) {
        users[userIndex] = {...users[userIndex], ...updatedUser};
    } else {
        users.push(updatedUser);
    }
    renderUserList();
});

// Khi kết nối socket thành công
socket.on('connect', () => {
    console.log('Kết nối socket thành công');
    // Yêu cầu danh sách người dùng từ server
    socket.emit('requestUserList');
});

// Lắng nghe sự kiện cập nhật danh sách người dùng từ server
socket.on('updateUserList', (updatedUsers) => {
    users = updatedUsers;
    renderUserList();
});

// Lắng nghe sự kiện cập nhật trạng thái người dùng
socket.on('updateUserStatus', (updatedUser) => {
    const userIndex = users.findIndex(user => user.name === updatedUser.name);
    if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        renderUserList();
    }
});

// Gọi renderUserList khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    renderUserList();
});

// Hàm để render danh sách người dùng
function renderUserList() {
    const userListElement = document.getElementById('userList');
    userListElement.innerHTML = "";

    users.filter((x) => x.name !== "Admin" && x.roleId !== 3 && x.messages && x.messages.length > 0).forEach((user) => {
        const userItem = document.createElement('li');
        userItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
        if (selectedUser.name === user.name) {
            userItem.classList.add('active');
        }
        userItem.textContent = `Người dùng ẩn danh (${user.name})`;

        const statusBadge = document.createElement('span');
        statusBadge.classList.add('badge');
        if (user.unread) {
            statusBadge.classList.add('badge-danger');
            statusBadge.textContent = "New";
        } else if (user.online) {
            statusBadge.classList.add('badge-success');
            statusBadge.textContent = "Online";
        } else {
            statusBadge.classList.add('badge-secondary');
            statusBadge.textContent = "Offline";
        }
        userItem.appendChild(statusBadge);

        userItem.addEventListener('click', () => selectUser(user));
        userListElement.appendChild(userItem);
    });
}

// Hàm để chọn người dùng
function selectUser(user) {
    selectedUser = user;
    messages = user.messages || [];
    user.unread = false;
    renderMessages();
    renderUserList(); // Gọi lại renderUserList để cập nhật trạng thái active
    socket.emit("onUserSelected", user);
}

// Hàm để render tin nhắn giữa admin và người dùng
function renderMessages() {
    const messageListElement = document.getElementById('messageList');
    messageListElement.innerHTML = "";

    if (messages.length === 0) {
        const noMessageItem = document.createElement('li');
        noMessageItem.textContent = "No messages";
        noMessageItem.classList.add('list-group-item');
        messageListElement.appendChild(noMessageItem);
    } else {
        messages.forEach((msg) => {
            const messageItem = document.createElement('li');
            messageItem.classList.add('list-group-item');
            // Hiển thị "Người dùng ẩn danh" cho tin nhắn từ người dùng
            const displayName = msg.from === selectedUser.name ? "Người dùng ẩn danh" : msg.from;
            messageItem.innerHTML = `<strong>${displayName}:</strong> ${msg.body}`;
            messageListElement.appendChild(messageItem);
        });
    }

    // Cuộn xuống cuối khi có tin nhắn mới
    messageListElement.scrollTop = messageListElement.scrollHeight;
}

// Gửi tin nhắn từ admin
function submitMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageBody = messageInput.value.trim();

    if (!messageBody || !selectedUser.name) {
        alert("Vui lòng chọn người dùng và nhập tin nhắn");
        return;
    }

    const message = { body: messageBody, from: "Admin", to: selectedUser.name };
    messages.push(message);
    renderMessages();

    socket.emit("onMessage", message);

    messageInput.value = '';
}

// Gán sự kiện gửi tin nhắn khi form được submit
document.getElementById('messageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitMessage();
});
