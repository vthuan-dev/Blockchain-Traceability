document.addEventListener('DOMContentLoaded', function() {
    const table = document.querySelector('.table');
    const searchInput = document.getElementById('search-input');
    const entriesSelect = document.querySelector('.entries-select');
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const removePanel = document.querySelector('.remove');
    const overlay = document.getElementById('overlay');
    const mainContent = document.querySelector('main');

    window.RegionManager = {
        regionData: [],
        filteredData: [],
        currentPage: 1,
        rowsPerPage: 5,

        formatDate: function(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
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
                        <td colspan="6" class="text-center">Không tìm thấy kết quả phù hợp</td>
                    </tr>
                `;
                tbody.innerHTML = emptyRow;
                this.updatePagination();
                return;
            }

            paginatedData.forEach(region => {
                const row = `
                    <tr>
                        <td>${region.region_id || 'N/A'}</td>
                        <td>${region.region_name || 'N/A'}</td>
                        <td>${region.district_name || 'N/A'}</td>
                        <td>${region.ward_name || 'N/A'}</td>
                        <td>${this.formatDate(region.created_at) || 'N/A'}</td>
                        <td>
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

        fetchRegionData: function() {
            fetch('/api/session')
            .then(response => response.json())
            .then(sessionData => {
                if (!sessionData.province_id) {
                    throw new Error('Không tìm thấy province_id trong session');
                }
                const adminProvinceId = sessionData.province_id;
                console.log('Admin Province ID:', adminProvinceId);

                return fetch(`/api/regions?province_id=${adminProvinceId}`)
                    .then(response => response.json())
                    .then(data => {
                        console.log('Dữ liệu regions nhận được:', data);
                        this.regionData = data.filter(region => region.region_id.startsWith(adminProvinceId));
                        this.filteredData = [...this.regionData];
                        this.renderTable();
                    });
            })
            .catch(error => console.error('Lỗi khi lấy dữ liệu vùng sản xuất:', error));

        },

        initializeRowsPerPage: function() {
            const entriesSelect = document.querySelector('.entries-select');
            if (entriesSelect) {
                this.rowsPerPage = parseInt(entriesSelect.value);
            }
        },

        deleteRegion: function(regionId) {
            fetch(`/api/regions/${regionId}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Lỗi khi xóa vùng sản xuất');
                }
                return response.json();
            })
            .then(data => {
                alert('Vùng sản xuất đã được xóa thành công');
                this.fetchRegionData();
            })
            .catch(error => {
                console.error('Lỗi khi xóa vùng sản xuất:', error);
                alert('Có lỗi xảy ra khi xóa vùng sản xuất: ' + error.message);
            });
        }
    };

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            window.RegionManager.filteredData = window.RegionManager.regionData.filter(region => 
                Object.values(region).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                )
            );
            window.RegionManager.currentPage = 1;
            window.RegionManager.renderTable();
        }, 300));
    }

    if (entriesSelect) {
        entriesSelect.addEventListener('change', () => {
            window.RegionManager.rowsPerPage = parseInt(entriesSelect.value);
            window.RegionManager.currentPage = 1;
            window.RegionManager.renderTable();
        });
    }

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (window.RegionManager.currentPage > 1) {
                window.RegionManager.currentPage--;
                window.RegionManager.renderTable();
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const totalPages = Math.ceil(window.RegionManager.filteredData.length / window.RegionManager.rowsPerPage);
            if (window.RegionManager.currentPage < totalPages) {
                window.RegionManager.currentPage++;
                window.RegionManager.renderTable();
            }
        });
    }

    if (table) {
        const tbody = table.querySelector('tbody');
        if (tbody) {
            tbody.addEventListener('click', function(e) {
                if (e.target.closest('.fa-trash-alt')) {
                    const row = e.target.closest('tr');
                    const regionId = row.cells[0].textContent;
                    showDeleteConfirmation(regionId, 'region');
                }
            });
        }
    }

    const cancelRemoveButton = document.getElementById('cancel-remove');
    if (cancelRemoveButton) {
        cancelRemoveButton.addEventListener('click', function(event) {
            event.preventDefault();
            hidePanel(removePanel);
        });
    }

    // Thêm xử lý sự kiện cho nút xác nhận xóa
    const acceptRemoveButton = document.getElementById('accept-remove');
    if (acceptRemoveButton) {
        acceptRemoveButton.addEventListener('click', function() {
            if (deleteType === 'region' && deleteId) {
                window.RegionManager.deleteRegion(deleteId);
                hideDeleteConfirmation();
            }
        });
    }

    // Khởi tạo bảng
    if (table) {
        window.RegionManager.fetchRegionData();
    }

    // Khởi tạo giá trị rowsPerPage từ select
    window.RegionManager.initializeRowsPerPage();

    // Thêm sự kiện để xử lý việc xóa vùng sản xuất
    document.querySelectorAll('.delete-region-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const regionId = event.target.closest('tr').dataset.id;
            showDeleteConfirmation(regionId, 'region');
        });
    });
});