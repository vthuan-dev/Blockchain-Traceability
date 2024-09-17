document.addEventListener('DOMContentLoaded', function() {
    const provinceInput = document.getElementById('province');

    // Fetch province_id từ session
    fetch('/api/session')
        .then(response => response.json())
        .then(sessionData => {
            if (!sessionData.province_id) {
                throw new Error('Không tìm thấy province_id trong session');
            }
            const adminProvinceId = sessionData.province_id;

            // Fetch province_name từ province_id
            return fetch(`/api/province/${adminProvinceId}`);
        })
        .then(response => response.json())
        .then(data => {
            if (data.province_name) {
                provinceInput.value = data.province_name;
            }
        })
        .catch(error => {
            console.error('Lỗi khi lấy thông tin tỉnh:', error);
        });
});
