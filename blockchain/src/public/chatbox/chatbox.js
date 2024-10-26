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
            const randomId = Math.random().toString(36).substr(2, 6);
            userName = `Người tiêu dùng ${randomId}`;
            userRoleId = 0;
        }
        socket.emit("onLogin", { name: userName, roleId: userRoleId });
    });

    socket.on("message", (data) => {
        addMessage(data);
    });
}
function addMessage(data) {
    const messages = document.getElementById('messages');
    const newMessage = document.createElement('li');
    newMessage.className = 'list-group-item';
    
    if (data.from === 'Admin') {
        newMessage.classList.add('admin');
        newMessage.innerHTML = `
            <span class="admin-name">Admin</span>
            <span>${data.body}</span>
        `;
    } else {
        newMessage.classList.add(data.from === userName ? 'sent' : 'received');
        newMessage.textContent = data.body;
    }
    
    messages.appendChild(newMessage);
    scrollToBottom();
}
function scrollToBottom() {
    const chatboxBody = document.querySelector('.chatbox-body');
    chatboxBody.scrollTop = chatboxBody.scrollHeight;
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
        if (data.userId) {
            userName = data.name;
            userRoleId = data.roleId;
        } else {
            // Tạo một ID ngẫu nhiên cho người dùng ẩn danh
            const randomId = Math.random().toString(36).substr(2, 6);
            userName = `Người tiêu dùng ${randomId}`;
            userRoleId = 0;
        }
        console.log("Thông tin người dùng:", { userName, userRoleId });
        initializeSocket();
    })
    .catch(error => {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        const randomId = Math.random().toString(36).substr(2, 6);
        userName = `Người tiêu dùng ${randomId}`;
        userRoleId = 0;
        initializeSocket();
    });

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('openChat').addEventListener('click', () => {
        document.getElementById('chatbox').style.display = 'block';
        scrollToBottom();
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
            const messageData = {
                body: messageBody,
                from: userName,
                to: "Admin",
            };
            addMessage(messageData);
            socket.emit("onMessage", messageData);
            messageInput.value = '';
        } else {
            console.error("Socket chưa được khởi tạo");
        }
    });
});
