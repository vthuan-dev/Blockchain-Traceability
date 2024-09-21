document.addEventListener('DOMContentLoaded', function() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    const menuOverlay = document.querySelector('.menu-overlay');
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    let isMenuOpen = false;

    function toggleMenu(event) {
        event.stopPropagation();
        isMenuOpen = !isMenuOpen;
        navbarCollapse.classList.toggle('show');
        menuOverlay.classList.toggle('show');
        document.body.classList.toggle('menu-open');
    }

    function closeMenu() {
        if (isMenuOpen) {
            isMenuOpen = false;
            navbarCollapse.classList.remove('show');
            menuOverlay.classList.remove('show');
            document.body.classList.remove('menu-open');
        }
    }

    if (navbarToggler) {
        navbarToggler.addEventListener('click', toggleMenu);
    }

    if (menuOverlay) {
        menuOverlay.addEventListener('click', closeMenu);
    }

    // Xử lý dropdown
    if (dropdownToggle) {
        dropdownToggle.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
    }

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', function(event) {
        if (!dropdownToggle.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Đóng menu khi click vào các mục trong menu, ngoại trừ dropdown
    const navItems = document.querySelectorAll('.navbar-nav .nav-link:not(.dropdown-toggle)');
    navItems.forEach(item => {
        item.addEventListener('click', closeMenu);
    });

    // Đóng menu khi click ra ngoài
    document.addEventListener('click', function(event) {
        const isClickInsideNavbar = navbarCollapse.contains(event.target) || navbarToggler.contains(event.target);
        if (!isClickInsideNavbar && isMenuOpen) {
            closeMenu();
        }
    });
});