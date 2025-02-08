document.addEventListener('DOMContentLoaded', async function() {
    // Xử lý menu mobile
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    const menuOverlay = document.querySelector('.menu-overlay');

    function toggleMenu() {
        navbarCollapse.classList.toggle('show');
        document.body.classList.toggle('menu-open');
        if (menuOverlay) {
            menuOverlay.classList.toggle('show');
        }
    }

    function closeMenu() {
        navbarCollapse.classList.remove('show');
        document.body.classList.remove('menu-open');
        if (menuOverlay) {
            menuOverlay.classList.remove('show');
        }
    }

    if (navbarToggler) {
        navbarToggler.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });
    }

    if (menuOverlay) {
        menuOverlay.addEventListener('click', closeMenu);
    }

    // Xử lý dropdown thông báo và user menu
    const notificationDropdown = document.querySelector('.notification-dropdown');
    const userDropdown = document.querySelector('.user-dropdown');
    const notificationMenu = document.querySelector('.notification-menu');
    const userMenu = document.querySelector('.dropdown-menu');

    if (notificationDropdown) {
        notificationDropdown.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            notificationMenu.classList.toggle('show');
        });
    }

    if (userDropdown) {
        userDropdown.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            userMenu.classList.toggle('show');
        });
    }

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', function(e) {
        if (notificationDropdown && !notificationDropdown.contains(e.target)) {
            notificationMenu?.classList.remove('show');
        }
        if (userDropdown && !userDropdown.contains(e.target)) {
            userMenu?.classList.remove('show');
        }
    });

    // Xử lý đăng xuất
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                const response = await fetch('/api/dangxuat', {
                    method: 'POST',
                    credentials: 'same-origin'
                });
                if (response.ok) {
                    const logoutMessage = document.getElementById('logoutMessage');
                    if (logoutMessage) {
                        logoutMessage.textContent = 'Đăng xuất thành công';
                        logoutMessage.style.display = 'block';
                        logoutMessage.style.opacity = '1';
                        
                        setTimeout(() => {
                            logoutMessage.style.opacity = '0';
                        }, 1500);

                        setTimeout(() => {
                            window.location.href = '../account/dangnhap.html';
                        }, 2000);
                    } else {
                        window.location.href = '../account/dangnhap.html';
                    }
                }
            } catch (error) {
                console.error('Lỗi khi đăng xuất:', error);
                alert('Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại sau.');
            }
        });
    }

    // Kiểm tra và hiển thị thông tin người dùng
    try {
        const response = await fetch('/api/user-info');
        if (response.ok) {
            const data = await response.json();
            const userNameElement = document.getElementById('userName');
            const userRoleElement = document.getElementById('userRole');
            const userRegionElement = document.getElementById('userRegion');

            if (userNameElement) userNameElement.textContent = data.name;
            if (userRoleElement) userRoleElement.textContent = `Vai trò: ${getRoleName(data.roleId)}`;
            if (userRegionElement && data.region) userRegionElement.textContent = `Khu vực: ${data.region}`;
        }
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
    }
});

function getRoleName(roleId) {
    switch (roleId) {
        case 1: return 'Người sản xuất';
        case 2: return 'Người kiểm duyệt';
        case 6: return 'Người vận chuyển';
        case 8: return 'Nhà kho';
        case 3: return 'Admin';
        default: return 'Không xác định';
    }
}