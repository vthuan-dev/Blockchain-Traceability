document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch('/api/user-info');
        if (response.ok) {
            const data = await response.json();
            const roleId = data.roleId; // Lấy roleId từ dữ liệu người dùng
            const navItems = document.getElementById('navItems');
            const navbarBrand = document.querySelector('.navbar-brand');
            const brandSpan = navbarBrand.querySelector('span');


            // Xóa các mục điều hướng hiện tại
            navItems.innerHTML = '';

            // Thêm các mục điều hướng dựa trên roleId
            if (roleId === 1) { // Người sản xuất
                navbarBrand.setAttribute('href', './san-xuat/sanxuat.html');
                brandSpan.textContent = 'Sản xuất';
                navItems.innerHTML += `
                    <li class="nav-item"><a class="nav-link" href="./san-xuat/sanxuat.html">Quản lí lô hàng</a></li>
                    <li class="nav-item"><a class="nav-link" href="./san-xuat/nhatky-hoatdong.html">Quản lí hoạt động</a></li>
                    <li class="nav-item"><a class="nav-link" href="#">Thông báo</a></li>
                `;
            } else if (roleId === 2) { // Người kiểm duyệt
                navbarBrand.setAttribute('href', '../kiem-duyet/nhakiemduyet.html');
                brandSpan.textContent = 'Nhà kiểm duyệt';
                navItems.innerHTML += `
                    <li class="nav-item"><a class="nav-link" href="../kiem-duyet/nhakiemduyet.html">Quản lí lô hàng</a></li>
                    <li class="nav-item"><a class="nav-link" href="../kiem-duyet/nhatky-hoatdong.html">Quản lí hoạt động</a></li>
                    <li class="nav-item"><a class="nav-link" href="#">Thông báo</a></li>
                `;
            } else if (roleId === 3) { // Admin
                navItems.innerHTML += `
                    <li class="nav-item"><a class="nav-link" href="../admin/dashboard.html">Bảng điều khiển</a></li>
                    <li class="nav-item"><a class="nav-link" href="../admin/users.html">Quản lí người dùng</a></li>
                `;
            }
            // Thêm các vai trò khác nếu cần
        } else {
            console.error('Không thể lấy thông tin người dùng');
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
});

function hasDataChanged() {
    const name = document.getElementById('userNameInput');
    const phone = document.getElementById('phoneInput');
    const address = document.getElementById('addressInput');
    const dob = document.getElementById('dobInput');
    const gender = document.getElementById('genderInput');
    const avatarInput = document.getElementById('imageUpload');

    return name.value !== name.defaultValue ||
           phone.value !== phone.defaultValue ||
           address.value !== address.defaultValue ||
           dob.value !== dob.defaultValue ||
           gender.value !== gender.defaultValue ||
           avatarInput.files.length > 0;
}