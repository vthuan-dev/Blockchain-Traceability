// Tạo một đối tượng toàn cục để chứa các hàm và biến
window.ProductManager = {
    productData: [],
    filteredData: [],
    currentPage: 1,
    rowsPerPage: 5, 

    formatDate: function(dateString) {
        return formatDate(dateString); // Sử dụng hàm từ feature.js
    },

    getProductImagePath: function(imagePath) {
        if (!imagePath || imagePath === 'path/to/default-product-image.png') {
            return 'path/to/default-product-image.png';
        }
        console.log('Image Path:', imagePath); 
        return imagePath;
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
                    <td colspan="7" class="text-center">Không tìm thấy kết quả phù hợp</td>
                </tr>
            `;
            tbody.innerHTML = emptyRow;
            this.updatePagination();
            return;
        }

        function escapeString(str) {
            return str.replace(/\\/g, '\\\\')
                      .replace(/'/g, "\\'")
                      .replace(/"/g, '\\"')
                      .replace(/\n/g, '\\n')
                      .replace(/\r/g, '\\r');
        }

        paginatedData.forEach(product => {
            const imagePath = this.getProductImagePath(product.img);
            console.log('Rendering Image Path:', imagePath); // Thêm dòng này để kiểm tra URL của ảnh khi render
            const row = `
                <tr>
                    <td style="text-align: center; vertical-align: middle;">${product.product_id}</td>
                    <td style="text-align: center; vertical-align: middle;">${product.product_name}</td>
                    <td style="text-align: center; vertical-align: middle;">${product.description}</td>
                    <td style="text-align: center; vertical-align: middle;">${product.price}</td>
                    <td style="text-align: center; vertical-align: middle;">
                        <img src="${imagePath}" alt="Ảnh sản phẩm" title="${imagePath}" style="width: 50px; height: 50px; object-fit: cover;">
                    </td>
                    <td style="text-align: center; vertical-align: middle;">${this.formatDate(product.created_at)}</td>
                    <td style="text-align: center; vertical-align: middle;">
                        <button class="action-icons bg-blue" title="Sửa" onclick="window.ProductManager.editProduct(${product.product_id}, '${escapeString(product.product_name)}', ${product.price}, '${escapeString(product.description)}', '${escapeString(product.uses)}', '${escapeString(product.process)}', '${escapeString(product.img)}')"><i class="fas fa-edit"></i></button>
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

    fetchProductData: function() {
        fetch('http://localhost:3000/api/theproducts')
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi khi tải dữ liệu');
            }
            return response.json();
        })
        .then(data => {
            console.log('Dữ liệu nhận được từ server:', data);
            if (!Array.isArray(data)) {
                throw new Error('Dữ liệu không đúng định dạng');
            }
            this.productData = data;
            this.filteredData = [...this.productData];
            console.log('Dữ liệu sản phẩm sau khi xử lý:', this.productData);
            this.renderTable();
        })
        .catch(error => console.error('Lỗi khi lấy dữ liệu sản phẩm:', error));
    },

    editProduct: function(id, name, price, description, uses, process, img) {
        console.log('ID:', id);
        console.log('Name:', name);
        console.log('Price:', price);
        console.log('Description:', description); // Kiểm tra giá trị của description
        console.log('Uses:', uses);
        console.log('Process:', process);
        console.log('Image:', img);

        const productData = {
            id, name, price, description, uses, process, img
        };
        
        // Nén dữ liệu sản phẩm trước khi lưu vào localStorage
        const compressedData = LZString.compressToUTF16(JSON.stringify(productData));
        console.log('Kích thước dữ liệu nén:', compressedData.length);
        localStorage.setItem('editingProduct', compressedData);
        
        // Chuyển hướng đến trang chỉnh sửa
        window.location.href = 'editproduct.html';
    },

    getEditingProduct: function() {
        const compressedData = localStorage.getItem('editingProduct');
        if (compressedData) {
            try {
                // Giải nén dữ liệu
                const decodedData = LZString.decompressFromUTF16(compressedData);
                return JSON.parse(decodedData);
            } catch (error) {
                console.error('Lỗi khi giải nén dữ liệu sản phẩm:', error);
                return null;
            }
        }
        return null;
    },

    clearEditingProduct: function() {
        localStorage.removeItem('editingProduct');
    },

    updateProduct: function(productData) {
        fetch('http://localhost:3000/api/products/update', {
            method: 'POST',
            body: JSON.stringify(productData),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi khi cập nhật dữ liệu');
            }
            return response.json();
        })
        .then(data => {
            console.log('Sản phẩm đã được cập nhật:', data);
            this.fetchProductData();
            // Chuyển hướng về trang danh sách sản phẩm sau khi cập nhật thành công
            window.location.href = 'product.html';
        })
        .catch(error => {
            console.error('Lỗi khi cập nhật sản phẩm:', error);
            alert('Có lỗi xảy ra khi cập nhật sản phẩm. Vui lòng thử lại.');
        });
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const table = document.querySelector('.table');
    const tbody = table ? table.querySelector('tbody') : null;
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const currentPageButton = document.getElementById('currentPage');
    const searchInput = document.getElementById('search-input');
    const entriesSelect = document.querySelector('.entries-select');
    const removePanel = document.querySelector('.remove');
    const overlay = document.getElementById('overlay');
    const mainContent = document.querySelector('main');
    let rowsPerPage = entriesSelect ? parseInt(entriesSelect.value) : 10;
    let currentPage = 1;
    let filteredData = [];
    let productData = [];

    function formatDate(dateString) {
        return formatDate(dateString); // Sử dụng hàm từ feature.js
    }

    function filterData() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        window.ProductManager.filteredData = window.ProductManager.productData.filter(product => 
            Object.values(product).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            )
        );
        console.log('Dữ liệu sau khi lọc:', window.ProductManager.filteredData);
        window.ProductManager.currentPage = 1;
        window.ProductManager.renderTable();
    }
    
    function renderTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedData = filteredData.slice(start, end);
    
        tbody.innerHTML = '';
    
        if (filteredData.length === 0) {
            const emptyRow = `
                <tr>
                    <td colspan="8" class="text-center">Không tìm thấy kết quả phù hợp</td>
                </tr>
            `;
            tbody.innerHTML = emptyRow;
            updatePagination();
            return;
        }
    
        paginatedData.forEach(product => {
            const imagePath = window.ProductManager.getProductImagePath(product.img);
            const row = `
                <tr>
                    <td>${product.product_id}</td>
                    <td>${product.product_name}</td>
                    <td>${product.description}</td>
                    <td>${product.price}</td>
                    <td>${imagePath}</td>
                    <td>${formatDate(product.created_at)}</td>
                    <td>
                        <button class="action-icons bg-blue" title="Sửa"><i class="fas fa-edit"></i></button>
                        <button class="action-icons bg-red" title="Xóa"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    
        updatePagination();
    }

    function updatePagination() {
        updatePagination(currentPage, rowsPerPage, filteredData); // Sử dụng hàm từ feature.js
    }

    function showPanel(panel) {
        showPanel(panel); // Sử dụng hàm từ feature.js
    }

    function hidePanel(panel) {
        hidePanel(panel); // Sử dụng hàm từ feature.js
    }

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterData, 300));
    }

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (window.ProductManager.currentPage > 1) {
                window.ProductManager.currentPage--;
                window.ProductManager.renderTable();
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const totalPages = Math.ceil(window.ProductManager.filteredData.length / window.ProductManager.rowsPerPage);
            if (window.ProductManager.currentPage < totalPages) {
                window.ProductManager.currentPage++;
                window.ProductManager.renderTable();
            }
        });
    }

    if (entriesSelect) {
        entriesSelect.addEventListener('change', () => {
            window.ProductManager.rowsPerPage = parseInt(entriesSelect.value);
            window.ProductManager.currentPage = 1;
            window.ProductManager.renderTable();
        });
    }

    if (tbody) {
        tbody.addEventListener('click', function(e) {
            if (e.target.closest('.fa-trash-alt')) {
                const row = e.target.closest('tr');
                const productId = row.cells[0].textContent;
                if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
                    deleteProduct(productId);
                }
            }
        });
    }

    const cancelRemoveButton = document.getElementById('cancel-remove');
    if (cancelRemoveButton) {
        cancelRemoveButton.addEventListener('click', function(event) {
            event.preventDefault();
            hidePanel(removePanel);
        });
    }

    // Thêm đoạn mã này để xử lý hiển thị tên file ảnh
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const fileName = e.target.files[0].name;
            const label = e.target.nextElementSibling;
            if (label && label.classList.contains('custom-file-label')) {
                // Giới hạn độ dài tên file và thêm dấu ba chấm nếu cần
                const maxLength = 20; // Bạn có thể điều chỉnh số này
                if (fileName.length > maxLength) {
                    label.textContent = fileName.substring(0, maxLength - 3) + '...';
                } else {
                    label.textContent = fileName;
                }
                
                // Thêm title để hiển thị tên đầy đủ khi hover
                label.title = fileName;
            }
        });
    });

    // Thêm hàm mới để xử lý việc thêm sản phẩm
    function addProduct(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
    
        // Kiểm tra dữ liệu trước khi gửi
        for (let [key, value] of formData.entries()) {
            if (!value) {
                showMessage(`Vui lòng điền đầy đủ thông tin: ${key}`, 'warning');
                return;
            }
        }
    
        fetch('http://localhost:3000/api/products', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Lỗi không xác định'); });
            }
            return response.json();
        })
        .then(data => {
            console.log('Sản phẩm đã được thêm:', data);
            showMessage('Sản phẩm đã được thêm thành công!', 'success');
            setTimeout(() => {
                window.location.href = 'product.html';
            }, 2000);
        })
        .catch((error) => {
            console.error('Lỗi:', error);
            showMessage('Có lỗi xảy ra khi thêm sản phẩm: ' + error.message, 'error');
        });
    }

    // Thêm event listener cho form
    const addProductForm = document.querySelector('.add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', addProduct);
    }

    // Khởi tạo bảng
    if (table) {
        window.ProductManager.fetchProductData();
    }
});
