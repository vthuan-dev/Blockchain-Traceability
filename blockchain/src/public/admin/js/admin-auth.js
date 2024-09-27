let socket = null;

function initAdminSocket() {
    const ENDPOINT = window.location.host.indexOf("localhost") >= 0 ? "http://127.0.0.1:3000" : window.location.host;
    socket = io(ENDPOINT);

    socket.on('connect', () => {
        console.log('Admin socket connected');
        checkAdminAuth();
    });

    socket.on("updateUnreadCount", (count) => {
        updateUnreadCount(count);
    });
}

function checkAdminAuth() {
    getUserInfo()
        .then(userInfo => {
            console.log('Admin đã đăng nhập:', userInfo);
            socket.emit("onLogin", userInfo);
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

function updateUnreadCount(count) {
    const replyCount = document.querySelector('.reply-count');
    if (replyCount) {
        replyCount.textContent = count;
        replyCount.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', initAdminSocket);