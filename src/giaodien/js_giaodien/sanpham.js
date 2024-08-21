
// Hiển thị ảnh lớn khi click vào ảnh nhỏ 
function showImage(img) {
    var overlay = document.getElementById('overlay');
    var overlayImg = document.getElementById('overlay-img');
    overlayImg.src = img.src;
    overlay.classList.add('active');
}

function hideImage() {
    var overlay = document.getElementById('overlay');
    overlay.classList.remove('active');
}


// Hàm để xử lý sự kiện click cho các tab
function handleTabClick(event) {
    // Loại bỏ lớp 'active' khỏi tất cả các tab
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    // Thêm lớp 'active' vào tab được nhấn
    document.getElementById(event.currentTarget.dataset.target).classList.add('active');
}

// Thêm sự kiện click cho từng tab
document.querySelectorAll('.col').forEach(col => {
    col.addEventListener('click', handleTabClick);
});


function handleTabClick(event) {
    // Loại bỏ lớp 'active' khỏi tất cả các tab
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.querySelectorAll('.col').forEach(col => col.classList.remove('active'));
    // Thêm lớp 'active' vào tab được nhấn
    document.getElementById(event.currentTarget.dataset.target).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Thêm sự kiện click cho từng tab
document.querySelectorAll('.col').forEach(col => {
    col.addEventListener('click', handleTabClick);
});