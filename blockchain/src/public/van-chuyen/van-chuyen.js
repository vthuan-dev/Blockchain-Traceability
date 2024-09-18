// Thêm các hàm xử lý quét QR và chấp nhận vận chuyển

document.addEventListener('DOMContentLoaded', function() {
    const qrInput = document.getElementById('qr-input');
    const scanButton = document.getElementById('scan-button');
    const fileSelected = document.getElementById('file-selected');

    qrInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            fileSelected.style.display = 'block';
            scanButton.disabled = false;
        } else {
            fileSelected.style.display = 'none';
            scanButton.disabled = true;
        }
    });

    scanButton.addEventListener('click', scanQRCode);
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('scan-button').disabled = false;
    } else {
        document.getElementById('scan-button').disabled = true;
    }
}

async function scanQRCode() {
    const fileInput = document.getElementById('qr-input');
    const file = fileInput.files[0];
    if (!file) {
        alert('Vui lòng chọn một file ảnh.');
        return;
    }

    const formData = new FormData();
    formData.append('qrImage', file);

    try {
        const response = await fetch('/api/scan-qr-and-get-batch', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Không thể quét mã QR');
        }

        const batchInfo = await response.json();
        displayBatchInfo(batchInfo);
    } catch (error) {
        console.error('Lỗi khi quét mã QR:', error);
        alert('Có lỗi xảy ra khi quét mã QR. Vui lòng thử lại.');
    }
}

function displayBatchInfo(batchInfo) {
    const batchInfoDiv = document.getElementById('batchInfo');
    const batchDetailsDiv = document.getElementById('batchDetails');
    
    const imageGalleryHtml = batchInfo.productImageUrls.map(url => `
        <div class="col-6 mb-2">
            <img src="${url}" alt="Hình ảnh lô hàng" class="img-fluid rounded batch-image">
        </div>
    `).join('');

    batchDetailsDiv.innerHTML = `
        <table class="table table-bordered">
         <tr>
                <th>Trạng thái:</th>
                <td>
                    <span class="status-approved">
                        <i class="fas fa-check-circle"></i> ${batchInfo.status}
                    </span>
                </td>
            </tr>
            <tr><th>Mã Lô hàng:</th><td>${batchInfo.batchId}</td></tr>
            <tr><th>Tên:</th><td>${batchInfo.name}</td></tr>
            <tr><th>Số lượng (tấn):</th><td>${batchInfo.quantity}</td></tr>
            <tr><th>Ngày tạo lô hàng:</th><td>${new Date(batchInfo.productionDate).toLocaleDateString()}</td></tr>
           
            <tr><th>Trạng thái vận chuyển:</th><td>${batchInfo.transportStatus}</td></tr>
            <tr>
                <th>Hình ảnh lô hàng:</th>
                <td>
                    <div class="row">
                        ${imageGalleryHtml}
                    </div>
                </td>
            </tr>
            <tr>
                <th>Giấy chứng nhận:</th>
                <td><img src="${batchInfo.certificateImageUrl}" alt="Giấy chứng nhận" class="img-fluid rounded certificate-image"></td>
            </tr>
        </table>
        <button onclick="acceptTransport('${batchInfo.batchId}')" class="btn btn-success mt-3">Chấp nhận vận chuyển</button>
    `;
    batchInfoDiv.style.display = 'block';
}

async function acceptTransport(batchId) {
    try {
        const response = await fetch('/api/accept-transport', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ batchId })
        });

        if (!response.ok) {
            throw new Error('Không thể chấp nhận vận chuyển');
        }

        const result = await response.json();
        alert(result.message);
        // Cập nhật lại thông tin lô hàng sau khi chấp nhận vận chuyển
        scanQRCode();
    } catch (error) {
        console.error('Lỗi khi chấp nhận vận chuyển:', error);
        alert('Có lỗi xảy ra khi chấp nhận vận chuyển. Vui lòng thử lại.');
    }
}

// Xóa hoặc comment out hàm fetchAndDisplayPendingBatches và các hàm liên quan
// vì chúng ta không cần hiển thị danh sách lô hàng ngay khi tải trang

// Xóa hoặc comment out đoạn code xử lý lọc theo trạng thái

// Thêm đoạn này vào cuối file
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = document.getElementsByClassName('close')[0];

    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('batch-image') || e.target.classList.contains('certificate-image')) {
            modal.style.display = "block";
            modalImg.src = e.target.src;
        }
    });

    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
});
