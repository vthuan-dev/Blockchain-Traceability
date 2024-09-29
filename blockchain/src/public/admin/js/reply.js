let selectedUser = {};
let users = [];
let messages = [];
let messageBody = "";

// Lắng nghe sự kiện socketInitialized để đảm bảo socket đã sẵn sàng
document.addEventListener('socketInitialized', (e) => {

    // Khi trang được tải, kiểm tra thông tin đăng nhập và kết nối
    document.addEventListener('DOMContentLoaded', () => {
        if (window.socket) {
            window.socket.emit('requestUserList');
        } else {
            console.error('Socket chưa được khởi tạo');
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
                renderUserList();
            }
        }
    });

    window.socket.on("updateUser", (updatedUser) => {
        const userIndex = users.findIndex(u => u.name === updatedUser.name);
        if (userIndex !== -1) {
            users[userIndex] = {...users[userIndex], ...updatedUser};
        } else {
            users.push(updatedUser);
        }
        renderUserList();
    });

    // Khi kết nối socket thành công
    window.socket.on('connect', () => {
        console.log('Kết nối socket thành công');
        // Yêu cầu danh sách người dùng từ server
        window.socket.emit('requestUserList');
    });

    // Lắng nghe sự kiện cập nhật danh sách người dùng từ server
    window.socket.on('updateUserList', (updatedUsers) => {
        users = updatedUsers;
        renderUserList();
    });

    // Lắng nghe sự kiện cập nhật trạng thái người dùng
    window.socket.on('updateUserStatus', (updatedUser) => {
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
});

// Hàm để render danh sách người dùng
function renderUserList() {
    const userListElement = document.getElementById('userList');
    userListElement.innerHTML = "";
    let newCount = 0;

    users.filter((x) => x.name !== "Admin" && x.roleId !== 3 && x.messages && x.messages.length > 0).forEach((user) => {
        const userItem = document.createElement('li');
        userItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
        if (selectedUser.name === user.name) {
            userItem.classList.add('active');
        }
        userItem.textContent = user.name;

        const statusBadge = document.createElement('span');
        statusBadge.classList.add('badge');
        if (user.unread) {
            statusBadge.classList.add('badge-danger');
            statusBadge.textContent = "New";
            newCount++;
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

    // Gửi số lượng tin nhắn mới đến server
    if (window.socket) {
        console.log("Emitting updateNewCount with count:", newCount); // Thêm log để kiểm tra
        window.socket.emit("updateNewCount", newCount);
    }
}


    
// Hàm để chọn người dùng
function selectUser(user) {
    selectedUser = user;
    messages = user.messages || [];
    user.unread = false;
    renderMessages();
    renderUserList(); // Gọi lại renderUserList để cập nhật trạng thái active
    window.socket.emit("onUserSelected", user);
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
            const displayName = msg.from === selectedUser.name ? selectedUser.name : msg.from;
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
        showMessage("Vui lòng chọn người dùng và nhập tin nhắn", 'warning');
        return;
    }

    const message = { body: messageBody, from: "Admin", to: selectedUser.name };
    messages.push(message);
    renderMessages();

    window.socket.emit("onMessage", message);

    messageInput.value = '';
}

// Gán sự kiện gửi tin nhắn khi form được submit
document.getElementById('messageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitMessage();
});