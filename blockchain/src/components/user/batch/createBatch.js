document.getElementById('createBatchForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    try {
        const response = await fetch('/createbatch', {
            method: 'POST',
            body: formData
        });

        const result = await response.text();
        document.getElementById('response').innerText = result;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('response').innerText = 'Lỗi khi tạo lô hàng';
    }
});