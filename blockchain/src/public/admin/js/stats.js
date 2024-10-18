window.StatManager = {
    async getUserCount() {
        try {
            const response = await fetch('/api/users');
            const users = await response.json();
            return users.length;
        } catch (error) {
            console.error('Lỗi khi lấy số lượng người dùng:', error);
            return 0;
        }
    },

    updateUserCount() {
        this.getUserCount().then(count => {
            const userCountElement = document.querySelector('.stat-card-custom.bg-green .stat-info p');
            if (userCountElement) {
                userCountElement.textContent = `${count} người dùng`;
            }
        });
    },

    async getProductCount() {
        try {
            const response = await fetch('/api/theproducts');
            const products = await response.json();
            return products.length;
        } catch (error) {
            console.error('Lỗi khi lấy số lượng sản phẩm:', error);
            return 0;
        }
    },

    updateProductCount() {
        this.getProductCount().then(count => {
            const productCountElement = document.querySelector('.stat-card-custom.bg-blue .stat-info p');
            if (productCountElement) {
                productCountElement.textContent = `${count} sản phẩm`;
            }
        });
    },

    async renderUserStats() {
        const userContent = `
        <div class="row chart-row">
            <div class="col-md-9">
                <div class="row">
                    <div class="col-md-4">
                        <div class="chart-container" style="position: relative; height:250px; width:100%">
                            <canvas id="genderChart"></canvas>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="chart-container" style="position: relative; height:250px; width:100%">
                            <canvas id="roleChart"></canvas>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="chart-container" style="position: relative; height:250px; width:100%">
                            <canvas id="ageChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div class="chart-separator"></div> 
            
            <div class="col-md-3">
                <div class="chart-container" style="position: relative; height:250px; width:100%">
                    <input type="text" id="provinceSearch" placeholder="Tìm kiếm tỉnh" class="form-control mb-2">
                    <canvas id="provinceChart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12">
                <div class="chart-container" style="position: relative; height:400px; width:100%">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5>Số lượng đăng ký người dùng</h5>
                        <select id="registrationPeriod" class="form-control" style="width: auto;">
                            <option value="monthly">Theo tháng</option>
                            <option value="weekly">Theo tuần</option>
                        </select>
                    </div>
                    <canvas id="registrationChart"></canvas>
                </div>
            </div>
        </div>
    `;
    document.getElementById('users').innerHTML = userContent;

        try {
            const [statsResponse, provinceStatsResponse, registrationStatsResponse] = await Promise.all([
                fetch('/api/users/stats'),
                fetch('/api/users/stats/province'),
                fetch('/api/users/registration-stats')
            ]);
            const stats = await statsResponse.json();
            const provinceStats = await provinceStatsResponse.json();
            const registrationStats = await registrationStatsResponse.json();

            this.createGenderChart(stats.genderData);
            this.createRoleChart(stats.roleData);
            this.createAgeChart(stats.ageData);
            this.createProvinceChart(provinceStats);
            this.createRegistrationChart(registrationStats);
        } catch (error) {
            console.error('Lỗi khi lấy thống kê người dùng:', error);
        }
    },

    createGenderChart(data) {
        const ctx = document.getElementById('genderChart').getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Nam', 'Nữ'],
                datasets: [{
                    data: [data.male, data.female],
                    backgroundColor: ['#36A2EB', '#FF6384']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Phân bố giới tính'
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    },

    createRoleChart(data) {
        const ctx = document.getElementById('roleChart').getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: ['#FFCE56', '#4BC0C0', '#FF9F40', '#9966FF']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Phân bố chức vụ'
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    },

    createAgeChart(data) {
        const ctx = document.getElementById('ageChart').getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['18-25', '26-35', '36-45', '46+'],
                datasets: [{
                    data: [data.age18to25, data.age26to35, data.age36to45, data.age46plus],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Phân bố độ tuổi'
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    },

    createProvinceChart(data) {
        const ctx = document.getElementById('provinceChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',  
            data: {
                labels: data.map(item => item.province_name),
                datasets: [{
                    label: 'Số lượng người dùng',
                    data: data.map(item => item.user_count),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                    ]
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 5 tỉnh có nhiều người dùng nhất'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            display: false // Ẩn các con số bên dưới các cột
                        }
                    }
                }
            }
        });
    
        // Thêm chức năng tìm kiếm
        document.getElementById('provinceSearch').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredData = data.filter(item => 
                item.province_name.toLowerCase().includes(searchTerm)
            );
    
            chart.data.labels = filteredData.map(item => item.province_name);
            chart.data.datasets[0].data = filteredData.map(item => item.user_count);
            chart.update();
        });
    },

    createRegistrationChart(data) {
        const ctx = document.getElementById('registrationChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Số lượng đăng ký',
                    data: [],
                    borderColor: '#36A2EB',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            parser: 'yyyy-MM-dd',
                            tooltipFormat: 'dd/MM/yyyy'
                        },
                        title: {
                            display: true,
                            text: 'Thời gian'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Số lượng đăng ký'
                        },
                        ticks: {
                            stepSize: 1,
                            precision: 0
                        }
                    }
                }
            }
        });
    
        function updateChart(period) {
            if (period === 'monthly') {
                const dailyData = data.daily;
                const labels = [];
                const dataPoints = [];
                let cumulativeCount = 0;
        
                // Tạo mảng chứa 30 ngày gần nhất
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // 30 ngày tính cả ngày hiện tại
                
                for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
                    const dateString = d.toISOString().split('T')[0];
                    labels.push(dateString);
                    
                    const dayData = dailyData.find(item => {
                        const itemDate = new Date(item.date).toISOString().split('T')[0];
                        return itemDate === dateString;
                    });
        
                    if (dayData) {
                        cumulativeCount += dayData.count;
                    }
                    dataPoints.push(cumulativeCount);
                }
        
                chart.data.labels = labels;
                chart.data.datasets[0].data = dataPoints;
                chart.options.scales.x.time.unit = 'day';
                chart.options.scales.x.time.tooltipFormat = 'dd/MM/yyyy';
            } else {
                const weeklyData = data.weekly;
                const labels = [];
                const dataPoints = [];
                let cumulativeCount = 0;
        
                weeklyData.forEach(item => {
                    const date = new Date(item.year, 0, 1 + (item.week - 1) * 7);
                    labels.push(date.toISOString().split('T')[0]);
                    cumulativeCount += item.count;
                    dataPoints.push(cumulativeCount);
                });
        
                chart.data.labels = labels;
                chart.data.datasets[0].data = dataPoints;
                chart.options.scales.x.time.unit = 'week';
                chart.options.scales.x.time.tooltipFormat = 'dd/MM/yyyy';
            }
            chart.update();
        }
        
        updateChart('monthly'); // Hiển thị mặc định là 30 ngày gần nhất
        
        document.getElementById('registrationPeriod').addEventListener('change', (e) => {
            updateChart(e.target.value);
        });
    },

    async renderProductStats() {
        const productContent = `
            <div class="row">
                <div class="col-md-4">
                    <div class="stat-card-custom bg-blue">
                        <div class="stat-info">
                            <h3>Tổng số sản phẩm</h3>
                            <p id="totalProducts">Đang tải...</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card-custom bg-green">
                        <div class="stat-info">
                            <h3>Giá trung bình</h3>
                            <p id="averagePrice">Đang tải...</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="chart-container" style="position: relative; height:250px; width:100%">
                        <canvas id="priceRangeChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('products').innerHTML = productContent;
        await this.updateProductStats();
    },

    async updateProductStats() {
        try {
            const response = await fetch('/api/theproducts');
            const products = await response.json();
            
            // Tổng số sản phẩm
            const totalProducts = products.length;
            document.getElementById('totalProducts').textContent = totalProducts;

            // Giá trung bình
            const totalPrice = products.reduce((sum, product) => sum + parseFloat(product.price), 0);
            const averagePrice = totalPrice / totalProducts;
            document.getElementById('averagePrice').textContent = `${averagePrice.toLocaleString('vi-VN')} VNĐ`;

            // Thống kê theo khoảng giá
            const priceRanges = {
                '<100k': 0,
                '100k-500k': 0,
                '>500k': 0
            };

            products.forEach(product => {
                const price = parseFloat(product.price);
                if (price < 100000) {
                    priceRanges['<100k']++;
                } else if (price >= 100000 && price <= 500000) {
                    priceRanges['100k-500k']++;
                } else {
                    priceRanges['>500k']++;
                }
            });

            this.createPriceRangeChart(priceRanges);

        } catch (error) {
            console.error('Lỗi khi lấy thống kê sản phẩm:', error);
        }
    },

    createPriceRangeChart(data) {
        const ctx = document.getElementById('priceRangeChart').getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Phân bố giá sản phẩm'
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    },

    initTabs() {
        const tabs = document.querySelectorAll('#statsTabs .nav-link');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = document.querySelector(tab.getAttribute('href'));
                document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('show', 'active'));
                target.classList.add('show', 'active');
                
                if (tab.id === 'users-tab') {
                    this.renderUserStats();
                } else if (tab.id === 'products-tab') {
                    this.renderProductStats();
                }
            });
        });
    }
};

    

document.addEventListener('DOMContentLoaded', () => {
    StatManager.updateUserCount();
    StatManager.updateProductCount();
    StatManager.initTabs();
    StatManager.renderUserStats();
    StatManager.renderProductStats();
})
