let socket = null;
let userName = "";
let userRoleId = null;

function initializeSocket() {
    const ENDPOINT = window.location.host.indexOf("localhost") >= 0 ? "http://127.0.0.1:3000" : window.location.host;
    socket = io(ENDPOINT);

    socket.on("connect", () => {
        console.log("Đã kết nối với server");
        if (!userName || !userRoleId) {
            // Tạo một ID ngẫu nhiên cho người dùng ẩn danh
            const anonymousId = 'anonymous_' + Math.random().toString(36).substr(2, 9);
            userName = anonymousId;
            userRoleId = 0;
        }
        socket.emit("onLogin", { name: userName, roleId: userRoleId });
    });

    socket.on("message", (data) => {
        const messages = document.getElementById('messages');
        const newMessage = document.createElement('li');
        newMessage.className = 'list-group-item';
        // Hiển thị "Bạn" cho tin nhắn của người dùng, và tên thật cho tin nhắn từ Admin
        const displayName = data.from === userName ? "Bạn" : data.from;
        newMessage.innerHTML = `<strong>${displayName}: </strong> ${data.body}`;
        messages.appendChild(newMessage);
        messages.scrollTop = messages.scrollHeight;
    });
}

// Lấy userName và roleId từ session khi người dùng đăng nhập
fetch('/user-info')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        userName = data.name || "Người dùng ẩn danh";
        userRoleId = data.roleId;
        console.log("Thông tin người dùng:", { userName, userRoleId });
        initializeSocket();
    })
    .catch(error => {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        userName = "Người dùng ẩn danh";
        userRoleId = 0; // Giả sử 0 là roleId cho khách
        initializeSocket();
    });

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('openChat').addEventListener('click', () => {
        document.getElementById('chatbox').style.display = 'block';
    });

    document.getElementById('closeChat').addEventListener('click', () => {
        document.getElementById('chatbox').style.display = 'none';
    });

    document.getElementById('messageForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const messageInput = document.getElementById('messageInput');
        const messageBody = messageInput.value.trim();
        if (!messageBody) {
            alert("Vui lòng nhập tin nhắn.");
        } else if (socket) {
            const messages = document.getElementById('messages');
            const newMessage = document.createElement('li');
            newMessage.className = 'list-group-item';
            newMessage.innerHTML = `<strong>Bạn: </strong> ${messageBody}`;
            messages.appendChild(newMessage);
            socket.emit("onMessage", {
                body: messageBody,
                from: userName,
                to: "Admin",
            });
            messageInput.value = '';
            messages.scrollTop = messages.scrollHeight;
        } else {
            console.error("Socket chưa được khởi tạo");
        }
    });
});
