// admin-auth.js

function initAdminSocket() {
    const ENDPOINT = window.location.host.indexOf("localhost") >= 0 ? "http://127.0.0.1:3000" : window.location.host;
    window.socket = io(ENDPOINT);

    window.socket.on('connect', () => {
        console.log('Admin socket connected');
        checkAdminAuth();
        initUnreadCount(); // Lắng nghe sự kiện để cập nhật tin nhắn chưa đọc
    });
}

function checkAdminAuth() {
    getUserInfo()
        .then(userInfo => {
            console.log('Admin đã đăng nhập:', userInfo);
            window.socket.emit("onLogin", userInfo);
            document.dispatchEvent(new CustomEvent('socketInitialized', { detail: window.socket }));
        })
        .catch(error => {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            window.location.href = '../account/dangnhap.html';
        });
}

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

// Hàm lắng nghe và cập nhật số tin nhắn chưa đọc
function initUnreadCount() {
    if (window.socket) {
        window.socket.on("updateUnreadCount", (count) => {
            console.log("Received updateUnreadCount on admin page:", count); // Kiểm tra log này
            updateUnreadCount(count);
        });
    } else {
        console.error('Socket chưa được khởi tạo');
    }
}



// Hàm cập nhật số lượng tin nhắn chưa đọc trên tất cả các trang
function updateUnreadCount(count) {
    const replyCountElements = document.querySelectorAll('.reply-count');
    replyCountElements.forEach(element => {
        element.textContent = count;
        element.style.display = count > 0 ? 'inline-block' : 'none';
    });
}

document.addEventListener('DOMContentLoaded', initAdminSocket);
