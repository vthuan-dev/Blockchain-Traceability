// Tạo một đối tượng toàn cục để chứa các hàm và biến
window.UserManager = {
    userData: [],
    filteredData: [],
    currentPage: 1,
    rowsPerPage: 5, // Đặt giá trị mặc định là 5

    formatDate: function(dateString) {
        return formatDate(dateString); // Sử dụng hàm từ feature.js
    },

    getRole: function(roleId) {
        switch (roleId) {
            case 1: return 'Nhà sản xuất';
            case 2: return 'Nhà kiểm duyệt';
            default: return 'Không xác định';
        }
    },

    getApproved: function(approved) {
        return approved === 1 ? 'Đã xác thực' : 'Chưa xác thực';
    },

    renderTable: function() {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;

        const start = (this.currentPage - 1) * this.rowsPerPage;
        const end = start + this.rowsPerPage;
        const paginatedData = this.filteredData.slice(start, end);

        tbody.innerHTML = '';

        if (this.filteredData.length === 0) {
            const emptyRow = `
                <tr>
                    <td colspan="13" class="text-center">Không tìm thấy kết quả phù hợp</td>
                </tr>
            `;
            tbody.innerHTML = emptyRow;
            this.updatePagination();
            return;
        }

        paginatedData.forEach(user => {
            const row = `
                <tr>
                    <td>${user.uid}</td>
                    <td>${user.phone}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.avatars}</td>
                    <td>${user.address}</td>
                    <td>${user.region_id}</td>
                    <td>${this.formatDate(user.dob)}</td>
                    <td>${user.gender}</td>
                    <td>${this.formatDate(user.created_at)}</td>
                    <td>${this.getRole(user.role_id)}</td>
                    <td>${this.getApproved(user.is_approved)}</td>
                    <td>
                        <button class="action-icons bg-red" title="Xóa"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        this.updatePagination();
    },

    updatePagination: function() {
        updatePagination(this.currentPage, this.rowsPerPage, this.filteredData); // Sử dụng hàm từ feature.js
    },

    fetchUserData: function() {
        fetch('http://localhost:3000/api/users')
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi khi tải dữ liệu');
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                throw new Error('Dữ liệu không đúng định dạng');
            }
            this.userData = data;
            this.filteredData = [...this.userData];
            console.log('Dữ liệu người dùng:', this.userData);
            this.renderTable();
        })
        .catch(error => console.error('Lỗi khi lấy dữ liệu người dùng:', error));
    },

    initializeRowsPerPage: function() {
        const entriesSelect = document.querySelector('.entries-select');
        if (entriesSelect) {
            this.rowsPerPage = parseInt(entriesSelect.value);
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const table = document.querySelector('.table');
    const searchInput = document.getElementById('search-input');
    const entriesSelect = document.querySelector('.entries-select');
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const removePanel = document.querySelector('.remove');
    const overlay = document.getElementById('overlay');
    const mainContent = document.querySelector('main');

    function showPanel(panel) {
        showPanel(panel); // Sử dụng hàm từ feature.js
    }

    function hidePanel(panel) {
        hidePanel(panel); // Sử dụng hàm từ feature.js
    }

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            window.UserManager.filteredData = window.UserManager.userData.filter(user => 
                Object.values(user).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                )
            );
            window.UserManager.currentPage = 1;
            window.UserManager.renderTable();
        }, 300));
    }

    if (entriesSelect) {
        entriesSelect.addEventListener('change', () => {
            window.UserManager.rowsPerPage = parseInt(entriesSelect.value);
            window.UserManager.currentPage = 1;
            window.UserManager.renderTable();
        });
    }

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (window.UserManager.currentPage > 1) {
                window.UserManager.currentPage--;
                window.UserManager.renderTable();
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const totalPages = Math.ceil(window.UserManager.filteredData.length / window.UserManager.rowsPerPage);
            if (window.UserManager.currentPage < totalPages) {
                window.UserManager.currentPage++;
                window.UserManager.renderTable();
            }
        });
    }

    if (table) {
        const tbody = table.querySelector('tbody');
        if (tbody) {
            tbody.addEventListener('click', function(e) {
                if (e.target.closest('.fa-trash-alt')) {
                    const row = e.target.closest('tr');
                    const userId = row.cells[0].textContent;
                    showDeleteConfirmation(userId, 'user');
                }
            });
        }
    }

    const cancelRemoveButton = document.getElementById('cancel-remove');
    if (cancelRemoveButton) {
        cancelRemoveButton.addEventListener('click', function(event) {
            event.preventDefault();
            hidePanel(removePanel);
        });
    }

    // Khởi tạo bảng
    if (table) {
        window.UserManager.fetchUserData();
    }

    // Khởi tạo giá trị rowsPerPage từ select
    window.UserManager.initializeRowsPerPage();

    const addAdminForm = document.querySelector('.add-admin-form');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const email = document.getElementById('admin-email').value;
            const name = document.getElementById('admin-name').value;
            const password = document.getElementById('admin-password').value;
            const confirmPassword = document.getElementById('admin-confirm-password').value;

            if (password !== confirmPassword) {
                alert('Mật khẩu xác nhận không khớp');
                return;
            }

            fetch('http://localhost:3000/api/admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, name, password }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Lỗi: ' + data.error);
                } else {
                    alert('Admin đã được thêm thành công');
                    window.location.href = 'user.html'; // Chuyển hướng về trang quản lý người dùng
                }
            })
            .catch(error => {
                console.error('Lỗi:', error);
                alert('Đã xảy ra lỗi khi thêm admin');
            });
        });
    }
});