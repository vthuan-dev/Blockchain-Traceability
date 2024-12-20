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

function createImageModal() {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <img class="modal-image" src="" alt="Enlarged Image">
            <div class="modal-controls">
                <button class="modal-btn prev-btn"><i class="fas fa-chevron-left"></i></button>
                <button class="modal-btn next-btn"><i class="fas fa-chevron-right"></i></button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function initializeImageViewer() {
    const modal = createImageModal();
    const modalImg = modal.querySelector('.modal-image');
    const closeBtn = modal.querySelector('.close-modal');
    const prevBtn = modal.querySelector('.prev-btn');
    const nextBtn = modal.querySelector('.next-btn');
    let currentImageIndex = 0;
    let currentImages = [];

    // Thêm sự kiện click cho tất cả ảnh sản phẩm và chứng nhận
    document.addEventListener('click', function(e) {
        const target = e.target;
        if (target.classList.contains('product-image') || target.classList.contains('certificate-image')) {
            const row = target.closest('tr');
            currentImages = [
                ...Array.from(row.querySelectorAll('.product-image')),
                ...Array.from(row.querySelectorAll('.certificate-image'))
            ].map(img => img.src);
            
            currentImageIndex = currentImages.indexOf(target.src);
            showModal(target.src);
        }
    });

    function showModal(imgSrc) {
        modal.style.display = 'flex';
        modalImg.src = imgSrc;
        updateNavigationButtons();
        document.body.style.overflow = 'hidden';
    }

    function updateNavigationButtons() {
        prevBtn.style.display = currentImageIndex > 0 ? 'block' : 'none';
        nextBtn.style.display = currentImageIndex < currentImages.length - 1 ? 'block' : 'none';
    }

    closeBtn.onclick = function() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    prevBtn.onclick = function(e) {
        e.stopPropagation();
        if (currentImageIndex > 0) {
            currentImageIndex--;
            modalImg.src = currentImages[currentImageIndex];
            updateNavigationButtons();
        }
    };

    nextBtn.onclick = function(e) {
        e.stopPropagation();
        if (currentImageIndex < currentImages.length - 1) {
            currentImageIndex++;
            modalImg.src = currentImages[currentImageIndex];
            updateNavigationButtons();
        }
    };

    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };
}

// Khởi tạo image viewer khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    initializeImageViewer();
});

