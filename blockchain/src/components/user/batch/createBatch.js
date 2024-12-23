document.getElementById('createBatchForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        // Lấy thông tin user từ session
        const userResponse = await fetch('/user-info');
        const userData = await userResponse.json();
        
        if (!userData.region_id) {
            throw new Error('Không tìm thấy thông tin vùng sản xuất');
        }

        const formData = new FormData(event.target);
        // Thêm region_id vào formData
        formData.append('region_id', userData.region_id);

        const response = await fetch('/createbatch', {
            method: 'POST',
            body: formData
        });

        const result = await response.text();
        document.getElementById('response').innerText = result;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('response').innerText = error.message || 'Lỗi khi tạo lô hàng';
    }
});