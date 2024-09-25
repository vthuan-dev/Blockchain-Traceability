// lấy danh sách sản phẩm để hiển thị trên trang chủ

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();

        const productContainer = document.querySelector('.sanpham .row');
        products.forEach(product => {
            const productCard = `
                <div class="col-md-3 col-6 mb-4" data-aos="fade-up">
                    <div class="card">
                        <img src="${product.img}" class="card-img-top" alt="${product.product_name}">
                        <div class="card-body">
                            <h5 class="card-title">${product.product_name}</h5>
                        </div>
                    </div>
                </div>
            `;
            productContainer.innerHTML += productCard;
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sản phẩm:', error);
    }
});
