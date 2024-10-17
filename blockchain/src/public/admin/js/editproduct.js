document.addEventListener('DOMContentLoaded', function() {
    const productData = window.ProductManager.getEditingProduct();
    if (productData) {
        // Điền dữ liệu vào form
        document.getElementById('product-id').value = productData.id;
        document.getElementById('product-name').value = productData.name;
        document.getElementById('product-price').value = productData.price;
        document.getElementById('product-description').value = productData.description;
        document.getElementById('product-uses').value = productData.uses;
        document.getElementById('product-process').value = productData.process;
        
        // Xử lý hiển thị ảnh nếu cần
        if (productData.img) {
            const imgPreview = document.getElementById('product-image-preview');
            if (imgPreview) {
                imgPreview.src = productData.img;
                imgPreview.style.display = 'block';
            }
        }
        
        // Xóa dữ liệu từ localStorage sau khi đã sử dụng
        window.ProductManager.clearEditingProduct();
    } else {
        console.error('Không tìm thấy dữ liệu sản phẩm');
        // Xử lý trường hợp không có dữ liệu, ví dụ: chuyển hướng về trang danh sách sản phẩm
        window.location.href = 'product.html';
    }
});