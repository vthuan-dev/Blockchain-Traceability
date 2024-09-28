function initAdminSocket() {
    const ENDPOINT = window.location.host.indexOf("localhost") >= 0 ? "http://127.0.0.1:3000" : window.location.host;
    window.socket = io(ENDPOINT);

    window.socket.on('connect', () => {
        console.log('Admin socket connected');
        checkAdminAuth();
        initUnreadCount(); // Thêm dòng này
    });
}

function checkAdminAuth() {
    getUserInfo()
        .then(userInfo => {
            console.log('Admin đã đăng nhập:', userInfo);
            window.socket.emit("onLogin", userInfo);
            // Đảm bảo rằng socket được truyền sang reply.js
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

document.addEventListener('DOMContentLoaded', initAdminSocket);

// Bắt sự kiện từ reply.js để đảm bảo socket được truyền
document.addEventListener('socketInitialized', (e) => {
    window.socket = e.detail;
    // Đảm bảo rằng initUnreadCount được gọi sau khi socket được khởi tạo
    initUnreadCount();
});

// Thêm hàm này
function initUnreadCount() {
    if (window.socket) {
        window.socket.on("updateUnreadCount", (count) => {
            updateUnreadCount(count);
        });
    } else {
        console.error('Socket chưa được khởi tạo');
    }
}
