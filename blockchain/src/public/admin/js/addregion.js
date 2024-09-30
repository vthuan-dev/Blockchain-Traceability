document.addEventListener('DOMContentLoaded', function() {
    const districtSelect = document.getElementById('district');
    const wardSelect = document.getElementById('ward');
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
            return fetch(`/api/province/${adminProvinceId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.province_name) {
                        provinceInput.value = data.province_name;
                        provinceInput.dataset.provinceId = adminProvinceId; // Lưu province_id vào dataset
                    }

                    // Fetch districts based on province_id
                    return fetch(`/api/districts/${adminProvinceId}`);
                });
        })
        .then(response => response.json())
        .then(districts => {
            // Thêm tùy chọn mặc định
            districtSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
            // Thêm các quận/huyện vào danh sách
            districtSelect.innerHTML += districts.map(d => `<option value="${d.district_id}">${d.district_name}</option>`).join('');
        })
        .catch(error => {
            console.error('Lỗi khi lấy thông tin tỉnh hoặc quận/huyện:', error);
        });

    // Fetch wards based on selected district
    districtSelect.addEventListener('change', function() {
        const districtId = districtSelect.value;
        if (districtId) {
            fetch(`/api/wards/${districtId}`)
                .then(response => response.json())
                .then(wards => {
                    // Thêm tùy chọn mặc định
                    wardSelect.innerHTML = '<option value="">Chọn Xã/Phường</option>';
                    // Thêm các xã/phường vào danh sách
                    wardSelect.innerHTML += wards.map(w => `<option value="${w.ward_id}">${w.ward_name}</option>`).join('');
                })
                .catch(error => {
                    console.error('Lỗi khi lấy danh sách xã/phường:', error);
                });
        } else {
            // Nếu không có quận/huyện nào được chọn, đặt lại danh sách xã/phường
            wardSelect.innerHTML = '<option value="">Chọn Xã/Phường</option>';
        }
    });

    const form = document.querySelector('.add-region-form');
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const provinceId = provinceInput.dataset.provinceId; // Lấy province_id từ dataset
        const districtId = districtSelect.value;
        const wardName = wardSelect.options[wardSelect.selectedIndex].text; // Lấy tên xã/phường từ select
        const districtName = districtSelect.options[districtSelect.selectedIndex].text;
        const regionName = document.getElementById('region-name').value;

        try {
            const response = await fetch('/api/regions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    province_id: provinceId,
                    district_id: districtId,
                    region_name: regionName,
                    ward_name: wardName,
                    district_name: districtName
                })
            });
            const data = await response.json();
            if (data.success) {
                showMessage('Vùng sản xuất đã được thêm thành công', 'success');
                window.location.href = 'region.html';
            } else {
                showMessage('Lỗi khi thêm vùng sản xuất: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu:', error);
            showMessage('Lỗi khi gửi yêu cầu', 'error');
        }
    });
});