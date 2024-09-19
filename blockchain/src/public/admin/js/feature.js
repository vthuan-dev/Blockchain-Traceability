document.addEventListener('DOMContentLoaded', () => {
    const profileIcon = document.getElementById('profileIcon');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const notificationPanel = document.querySelector('.notification-panel');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const notificationList = document.getElementById('notificationList');
    const confirmReadButton = document.getElementById('confirmRead');

    // Toggle dropdown menu
    if (profileIcon && dropdownMenu) {
        profileIcon.addEventListener('click', () => {
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Toggle notification panel
    document.getElementById('notificationIcon').addEventListener('click', () => {
        notificationPanel.classList.toggle('show');
    });

    // Close dropdown or notification panel when clicking outside
    window.addEventListener('click', (e) => {
        if (!document.getElementById('notificationIcon').contains(e.target) && !notificationPanel.contains(e.target)) {
            notificationPanel.classList.remove('show');
        }
        if (!profileIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });

    // Sidebar toggle button click
    sidebarToggle.addEventListener('click', toggleSidebar);

    // Close sidebar when clicking outside and reset toggle button position
    document.addEventListener('click', (event) => {
        if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
            sidebar.classList.remove('show');
            resetSidebarToggle();
        }
    });

    // Initialize clock
    time();

    // Fetch admin info and update section title
    fetchAdminInfo();

    // Fetch notifications
    fetchNotifications();

    // Initialize WebSocket connection
    const socket = new WebSocket('ws://localhost:8080');

    socket.addEventListener('message', (event) => {
        const notification = JSON.parse(event.data);
        const li = document.createElement('li');
        li.textContent = notification.message;
        li.setAttribute('data-id', notification.notification_id); // Lưu ID thông báo
        notificationList.appendChild(li);
        confirmReadButton.style.display = 'block'; // Hiện nút xác nhận
    });

    // Xóa đoạn code liên quan đến việc đánh dấu thông báo đã xem
    confirmReadButton.addEventListener('click', async () => {
        // Không cần logic này nữa
        notificationList.innerHTML = ''; // Xóa danh sách thông báo 
    });

    async function markAsRead(notificationId) {
        try {
            await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
        } catch (error) {
            console.error('Lỗi khi đánh dấu thông báo đã xem:', error);
        }
    }
});

// Function to fetch notifications
async function fetchNotifications() {
    try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
            const notifications = await response.json();
            const notificationList = document.getElementById('notificationList');
            notifications.forEach(notification => {
                const li = document.createElement('li');
                li.textContent = notification.message;
                li.setAttribute('data-id', notification.notification_id); // Lưu ID thông báo
                notificationList.appendChild(li);
            });
        } else {
            console.error('Không thể lấy thông báo');
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

// Function to toggle sidebar and manage toggle button position
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const toggleButton = document.querySelector('.sidebar-toggle');
    
    sidebar.classList.toggle('show');
    
    if (sidebar.classList.contains('show')) {
        // When sidebar is open, fix the position of the toggle button
        toggleButton.style.position = 'fixed';
        toggleButton.style.left = '200px';
        toggleButton.style.top = '80px'; // Adjust as needed
    } else {
        resetSidebarToggle();
    }
}

// Function to reset the sidebar toggle button to its original state
function resetSidebarToggle() {
    const toggleButton = document.querySelector('.sidebar-toggle');
    toggleButton.style.position = '';
    toggleButton.style.left = '';
    toggleButton.style.top = '';
}

// Clock function (unchanged)
function time() {
    const today = new Date();
    const weekday = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const day = weekday[today.getDay()];
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const h = String(today.getHours()).padStart(2, '0');
    const m = String(today.getMinutes()).padStart(2, '0');
    const s = String(today.getSeconds()).padStart(2, '0');
    const nowTime = `${h} giờ ${m} phút ${s} giây`;
    const currentDate = `${day}, ${dd}/${mm}/${yyyy}`;
    
    document.getElementById("clock").innerHTML = `<span class="date">${currentDate} - ${nowTime}</span>`;
    setTimeout(time, 1000);
}

// Function to fetch admin info and update section title
async function fetchAdminInfo() {
    try {
        const response = await fetch('/api/admin-info');
        if (response.ok) {
            const data = await response.json();
            document.querySelector('.section-title').textContent = `Xin chào, ${data.adminName}`;
        } else {
            console.error('Không thể lấy thông tin admin');
        }
    } catch (error) {
        console.error('Lỗi:', error);
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
    document.querySelector('.remove').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

function hideDeleteConfirmation() {
    document.querySelector('.remove').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    deleteId = null;
    deleteType = null;
}

document.getElementById('accept-remove').addEventListener('click', () => {
    if (deleteType === 'product') deleteProduct(deleteId);
    if (deleteType === 'user') deleteUser(deleteId);
    if (deleteType === 'region') deleteRegion(deleteId); // Thêm dòng này
    hideDeleteConfirmation();
});

document.getElementById('cancel-remove').addEventListener('click', hideDeleteConfirmation);

async function deleteItem(url, id) {
    try {
        const response = await fetch(`${url}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Xóa thất bại');
        const data = await response.json();
        alert(`${url.includes('products') ? 'Sản phẩm' : 'Người dùng'} đã được xóa thành công!`);
        if (url.includes('products') && typeof window.ProductManager.fetchProductData === 'function') {
            window.ProductManager.fetchProductData();
        } else if (url.includes('users') && typeof window.UserManager.fetchUserData === 'function') {
            window.UserManager.fetchUserData();
        }
    } catch (error) {
        alert('Có lỗi xảy ra khi xóa: ' + error.message);
    }
}

function deleteProduct(productId) {
    deleteItem('http://localhost:3000/api/products', productId);
}

function deleteUser(userId) {
    deleteItem('http://localhost:3000/api/users', userId);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function updatePagination(currentPage, rowsPerPage, filteredData) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    
    const paginationInfo = document.querySelector('.pagination-info');
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị kết quả từ mục ${(currentPage - 1) * rowsPerPage + 1} đến ${Math.min(currentPage * rowsPerPage, filteredData.length)}`;
    }
}

function showPanel(panel) {
    panel.style.display = 'block';
    panel.classList.add('fade-in');
    document.getElementById('overlay').style.display = 'block';
    document.querySelector('main').classList.add('disable-pointer');
}

function hidePanel(panel) {
    panel.classList.add('fade-out');
    setTimeout(() => {
        panel.style.display = 'none';
        panel.classList.remove('fade-in', 'fade-out');
        document.getElementById('overlay').style.display = 'none';
        document.querySelector('main').classList.remove('disable-pointer');
    }, 300);    
}
