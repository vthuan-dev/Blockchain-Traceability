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

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM đã được tải');
    const profileIcon = document.getElementById('profileIcon');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const notificationPanel = document.querySelector('.notification-panel');
    
    if (profileIcon && dropdownMenu) {
        profileIcon.addEventListener('click', () => {
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });
    } else {
        console.error('Không tìm thấy profileIcon hoặc dropdownMenu');
    }

    document.getElementById('notificationIcon').addEventListener('click', () => {
        notificationPanel.classList.toggle('show');
    });

    window.addEventListener('click', (e) => {
        if (!document.getElementById('notificationIcon').contains(e.target) && !notificationPanel.contains(e.target)) {
            notificationPanel.classList.remove('show');
        }
        if (!profileIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });

    document.querySelector('.sidebar-toggle').addEventListener('click', toggleSidebar);

    document.addEventListener('click', (event) => {
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
            sidebar.classList.remove('show');
        }
    });

    time();
});

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const toggleButton = document.querySelector('.sidebar-toggle');
    sidebar.classList.toggle('show');
    toggleButton.style.position = 'fixed';
    toggleButton.style.left = sidebar.classList.contains('show') ? '200px' : '10px';
    toggleButton.style.top = sidebar.classList.contains('show') ? '' : '80px';
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
