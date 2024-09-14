// Tạo một đối tượng toàn cục để chứa các hàm và biến
window.ProductManager = {
    productData: [],
    filteredData: [],
    currentPage: 1,
    rowsPerPage: 5, // Mặc định là 10, có thể thay đổi sau

    formatDate: function(dateString) {
        return formatDate(dateString); // Sử dụng hàm từ feature.js
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
                    <td colspan="8" class="text-center">Không tìm thấy kết quả phù hợp</td>
                </tr>
            `;
            tbody.innerHTML = emptyRow;
            this.updatePagination();
            return;
        }

        paginatedData.forEach(product => {
            const row = `
                <tr>
                    <td>${product.product_id}</td>
                    <td>${product.product_name}</td>
                    <td>${product.description}</td>
                    <td>${product.price}</td>
                    <td>${product.img}</td>
                    <td>${product.process_img}</td>
                    <td>${this.formatDate(product.created_at)}</td>
                    <td>
                        <button class="action-icons bg-blue" title="Sửa" onclick="window.ProductManager.editProduct(${product.product_id}, '${product.product_name}', ${product.price}, '${product.description}', '${product.uses}', '${product.process}')"><i class="fas fa-edit"></i></button>
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

    editProduct: function(id, name, price, description, uses, process) {
        const editLink = document.createElement('a');
        editLink.href = `editproduct.html?id=${id}&name=${encodeURIComponent(name)}&price=${price}&description=${encodeURIComponent(description)}&uses=${encodeURIComponent(uses)}&process=${encodeURIComponent(process)}`;
        editLink.style.display = 'none';
        document.body.appendChild(editLink);
        editLink.click();
        document.body.removeChild(editLink);
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
        })
        .catch(error => console.error('Lỗi khi cập nhật sản phẩm:', error));
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
            const row = `
                <tr>
                    <td>${product.product_id}</td>
                    <td>${product.product_name}</td>
                    <td>${product.description}</td>
                    <td>${product.price}</td>
                    <td>${product.img}</td>
                    <td>${product.process_img}</td>
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
                showDeleteConfirmation(productId, 'product');
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

    // Thêm hàm mới để xử lý việc thêm sản phẩm
    function addProduct(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target); // Sử dụng event.target để lấy form data

        // Kiểm tra dữ liệu trước khi gửi
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }

        fetch('http://localhost:3000/api/products', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => { throw new Error(error.error); });
            }
            return response.json();
        })
        .then(data => {
            console.log('Sản phẩm đã được thêm:', data);
            alert('Sản phẩm đã được thêm thành công!');
            window.location.href = 'product.html'; // Chuyển hướng về trang danh sách sản phẩm
        })
        .catch((error) => {
            console.error('Lỗi:', error);
            alert('Có lỗi xảy ra khi thêm sản phẩm: ' + error.message);
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
