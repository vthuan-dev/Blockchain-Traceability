// Hàm chung để load items với phân trang
async function loadItems(apiUrl, containerSelector, itemsPerPage, createCardFunction) {
    let currentPage = 1;
    let allItems = [];
    let isExpanded = false;
    
    try {
        const response = await fetch(apiUrl);
        allItems = await response.json();
        
        // Hiển thị items ban đầu
        displayItems(allItems, containerSelector, currentPage, itemsPerPage, createCardFunction);
        
        // Kiểm tra xem có cần hiển thị nút không
        const container = document.querySelector(containerSelector);
        let loadMoreBtn = container.parentElement.querySelector('.load-more-btn');
        
        if (allItems.length > itemsPerPage) {
            if (!loadMoreBtn) {
                // Tạo nút nếu chưa tồn tại
                loadMoreBtn = document.createElement('button');
                loadMoreBtn.className = 'btn load-more-btn mt-3';
                loadMoreBtn.textContent = 'Xem thêm';
                container.parentElement.appendChild(loadMoreBtn);
                
                // Thêm sự kiện click cho nút
                loadMoreBtn.addEventListener('click', () => {
                    if (!isExpanded) {
                        // Lưu vị trí scroll hiện tại
                        const scrollPosition = window.scrollY;
                        const oldHeight = container.scrollHeight;
                        
                        // Tăng số trang để hiển thị thêm items
                        currentPage++;
                        displayItems(allItems, containerSelector, currentPage, itemsPerPage, createCardFunction);
                        
                        // Kiểm tra nếu đã hiển thị hết items
                        if (currentPage * itemsPerPage >= allItems.length) {
                            loadMoreBtn.textContent = 'Thu gọn';
                            isExpanded = true;
                        }
                        
                        // Đợi DOM cập nhật và cuộn đến vị trí mới
                        setTimeout(() => {
                            const newHeight = container.scrollHeight;
                            const heightDiff = newHeight - oldHeight;
                            
                            // Cuộn xuống đến vị trí của items mới
                            window.scrollTo({
                                top: scrollPosition + heightDiff - 50, // Trừ 50px để tạo khoảng cách
                                behavior: 'smooth'
                            });
                        }, 100);
                        
                    } else {
                        // Thu gọn - hiển thị lại số items ban đầu
                        currentPage = 1;
                        displayItems(allItems, containerSelector, currentPage, itemsPerPage, createCardFunction);
                        loadMoreBtn.textContent = 'Xem thêm';
                        isExpanded = false;
                        
                        // Cuộn mượt về đầu container
                        const offset = container.getBoundingClientRect().top + window.scrollY - 20;
                        window.scrollTo({
                            top: offset,
                            behavior: 'smooth'
                        });
                    }
                });
            }
        }
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
    }
}

// Hàm hiển thị items theo trang
function displayItems(items, containerSelector, currentPage, itemsPerPage, createCardFunction) {
    const container = document.querySelector(containerSelector);
    const startIndex = 0;
    const endIndex = currentPage * itemsPerPage;
    
    // Lấy items cho trang hiện tại
    const currentItems = items.slice(startIndex, endIndex);
    
    // Xóa nội dung cũ và hiển thị items mới
    container.innerHTML = '';
    currentItems.forEach(item => {
        const card = createCardFunction(item);
        container.innerHTML += card;
    });
}

// Hàm tạo card cho sản phẩm
function createProductCard(product) {
    return `
        <div class="col-md-3 col-6 mb-3" data-aos="fade-up">
            <a href="sanpham.html?id=${product.product_id}" class="text-decoration-none">
                <div class="card product-card">
                    <div class="card-img-wrapper">
                        <img src="${product.img}" class="card-img-top" alt="${product.product_name}">
                    </div>
                    <div class="card-body text-center">
                        <h5 class="card-title">${product.product_name}</h5>
                    </div>
                </div>
            </a>
        </div>
    `;
}

// Hàm tạo card cho người dùng
function createUserCard(user) {
    return `
        <div class="col-md-3 col-6 mb-3" data-aos="fade-up">
            <a href="trangcanhan.html?uid=${user.uid}" class="text-decoration-none">
                <div class="card user-card" data-uid="${user.uid}">
                    <div class="card-img-wrapper">
                    <img src="${user.avatar || 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg'}" class="card-img-top" alt="${user.name}">
                </div>
                <div class="card-body text-center">
                    <h5 class="card-title">${user.name}</h5>
                    <div class="chucdanh">${user.role_name}</div>
                    ${user.region_name ? `<div class="vung">${user.region_name}</div>` : ''}
                    </div>
                </div>
            </a>
        </div>
    `;
}
