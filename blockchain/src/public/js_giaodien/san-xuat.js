
document.addEventListener('DOMContentLoaded', function() {
    // Đánh dấu mục điều hướng hiện tại
    const currentPath = window.location.pathname;
    if (currentPath.includes('sanxuat.html')) {
        document.getElementById('nav-quanli-lohang').classList.add('active');
    }
});


window.addEventListener('scroll', function() {
    var navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('navbar-scrolled');
    } else {
        navbar.classList.remove('navbar-scrolled');
    }
});