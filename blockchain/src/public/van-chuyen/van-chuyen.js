// Thêm các hàm xử lý quét QR và chấp nhận vận chuyển
let batchInfo; // Khai báo ở đầu file, ngoài hàm DOMContentLoaded


document.addEventListener('DOMContentLoaded', function() {
    const startCameraButton = document.getElementById('start-camera');
    const qrInput = document.getElementById('qr-input');
    const fileSelected = document.getElementById('file-selected');
    const scanButton = document.getElementById('scan-button');
    const qrReader = document.getElementById('qr-reader');
    let html5QrCode;

    startCameraButton.addEventListener('click', toggleQRScanner);
    qrInput.addEventListener('change', handleFileInput);
    scanButton.addEventListener('click', scanQR);

    function toggleQRScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            stopScanner();
        } else {
            startScanner();
        }
    }

    function startScanner() {
        html5QrCode = new Html5Qrcode("qr-reader");
        qrReader.style.display = 'block';
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            stopScanner();
            handleQRCode(decodedText);
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
            .then(() => {
                console.log("QR Code scanning is started");
                startCameraButton.textContent = 'Dừng quét';
                scanButton.disabled = true;
            })
            .catch((err) => {
                console.error(`Không thể bắt đầu quét QR: ${err}`);
                alert('Không thể bắt đầu quét QR. Vui lòng kiểm tra quyền truy cập camera.');
            });
    }

    function stopScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                console.log('QR Code scanning stopped.');
                startCameraButton.textContent = 'Quét QR bằng camera';
                qrReader.style.display = 'none';
                scanButton.disabled = false;
            }).catch((err) => {
                console.log('Unable to stop scanning.', err);
            });
        }
    }

    function handleFileInput(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // Giới hạn 5MB
                alert('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.');
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
                alert('Định dạng file không hỗ trợ. Vui lòng chọn file JPEG, PNG hoặc GIF.');
                return;
            }
            fileSelected.style.display = 'block';
            scanButton.disabled = false;
        } else {
            fileSelected.style.display = 'none';
            scanButton.disabled = true;
        }
    }

    function scanQR() {
        const file = qrInput.files[0];
        if (file) {
            scanQRFromImage(file);
        } else {
            startScanner();
        }
    }
    function scanQRFromImage(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0, img.width, img.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code) {
                    handleQRCode(code.data);
                } else {
                    console.error('Không tìm thấy mã QR trong ảnh');
                    alert('Không tìm thấy mã QR trong ảnh. Vui lòng thử lại với ảnh khác.');
                }
            };
            img.src = event.target.result;
        };
        reader.onerror = function() {
            console.error('Lỗi khi đọc file');
            alert('Có lỗi xảy ra khi đọc file. Vui lòng thử lại.');
        };
        reader.readAsDataURL(file);
    }
    function handleQRCode(decodedText) {
        console.log("QR Code detected:", decodedText);
        const sscc = decodedText.split(':')[1]; // Giả sử QR code có định dạng "SSCC:123456789"
        if (sscc) {
            fetchBatchInfo(sscc);
        } else {
            alert('Mã QR không hợp lệ');
        }
    }

    async function fetchBatchInfo(sscc) {
        try {
            const response = await fetch(`/api/batch-info-by-sscc/${sscc}`);
            if (!response.ok) {
                throw new Error('Không thể lấy thông tin lô hàng');
            }
            const batchInfo = await response.json();
            displayBatchInfo(batchInfo);
        } catch (error) {
            console.error('Lỗi khi lấy thông tin lô hàng:', error);
            alert('Có lỗi xảy ra khi lấy thông tin lô hàng. Vui lòng thử lại.');
        }
    }

    // Thêm hàm displayBatchInfo
    function displayBatchInfo(info) {
        batchInfo = info; // Lưu thông tin lô hàng vào biến toàn cục
        const batchInfoDiv = document.getElementById('batchInfo');
        const batchDetailsDiv = document.getElementById('batchDetails');
        
        console.log('Batch Info:', batchInfo); // Để kiểm tra dữ liệu
    
        let tableHTML = '<table class="batch-info-table">';
        
        const addRow = (label, value, className = '') => {
            tableHTML += `
                <tr>
                    <th>${label}</th>
                    <td class="${className}">${value}</td>
                </tr>
            `;
        };
       
        addRow('Trạng thái', `<span class="status-approved"><i class="fas fa-check-circle"></i> ${batchInfo.status}</span>`);
        addRow('Mã Lô hàng', batchInfo.batchId);
        addRow('Tên lô hàng', batchInfo.name);
        addRow('Số lượng (tấn)', batchInfo.quantity);
        addRow('Ngày tạo lô hàng', new Date(batchInfo.productionDate).toLocaleDateString());
        addRow('Trạng thái vận chuyển', batchInfo.transportStatus);
        addRow('Người sản xuất', batchInfo.producer.name);
        addRow('Địa chỉ', batchInfo.producer.address);
        addRow('Số điện thoại', batchInfo.producer.phone);
        // Hiển thị nút xem hình ảnh sản phẩm
        if (batchInfo.productImageUrls && Object.keys(batchInfo.productImageUrls).length > 0) {
            const imageCount = Object.keys(batchInfo.productImageUrls).length;
            addRow('Hình ảnh sản phẩm', `<button class="btn btn-primary" onclick="openImageGallery('product')">Xem ${imageCount} ảnh sản phẩm</button>`);
        }
    
        // Hiển thị nút xem hình ảnh lô hàng (nếu có)
        if (batchInfo.batchImageUrls && batchInfo.batchImageUrls.length > 0) {
            addRow('Hình ảnh lô hàng', `<button class="btn btn-primary" onclick="openImageGallery('batch')">Xem ${batchInfo.batchImageUrls.length} ảnh lô hàng</button>`);
        }
    
        // Hiển thị nút xem giấy chứng nhận
        if (batchInfo.certificateImageUrl) {
            addRow('Giấy chứng nhận', `<button class="btn btn-primary" onclick="openImageModal('${batchInfo.certificateImageUrl}')">Xem giấy chứng nhận</button>`);
        }
    
        tableHTML += '</table>';
    
        // Thêm nút cập nhật trạng thái vận chuyển
        let transportButton = '';
        if (info.transportStatus === 'Chưa vận chuyển') {
            transportButton = `<button id="startTransportBtn" onclick="updateTransportStatus('${info.batchId}', 'Bat dau van chuyen')" class="btn btn-success mt-3">Bắt đầu vận chuyển</button>`;
        } else if (info.transportStatus === 'Đang vận chuyển') {
            transportButton = `<button id="completeTransportBtn" onclick="updateTransportStatus('${info.batchId}', 'Hoan thanh van chuyen')" class="btn btn-success mt-3">Hoàn thành vận chuyển</button>`;
        }

        tableHTML += transportButton;
        batchDetailsDiv.innerHTML = tableHTML;
        batchInfoDiv.style.display = 'block';
    }
    
    // Hàm để mở modal khi click vào nút xem ảnh
    function openImageModal(src) {
        console.log('Opening modal for:', src);
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        modal.style.display = "block";
        modalImg.src = src;

        // Thêm event listener để đóng modal khi nhấn vào overlay
        modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    }
    
    // Hàm để mở gallery khi click vào nút xem nhiều ảnh
    function openImageGallery(type) {
        console.log('Opening gallery for:', type);
        console.log('Batch Info:', batchInfo);
        const modal = document.getElementById('imageModal');
        const modalContent = document.getElementById('modalContent');
        modal.style.display = "block";
        
        let galleryHTML = '<div class="image-gallery">';
        const images = type === 'product' ? batchInfo.productImageUrls : batchInfo.batchImageUrls;
        
        console.log('Images:', images);
        
        if (images && Object.keys(images).length > 0) {
            Object.values(images).forEach(url => {
                console.log('Adding image:', url);
                galleryHTML += `<img src="${url}" alt="${type} image" class="gallery-image" onclick="expandImage('${url}')">`;
            });
        } else {
            galleryHTML += '<p>Không có hình ảnh để hiển thị.</p>';
        }
        
        galleryHTML += '</div>';
        modalContent.innerHTML = galleryHTML;

        // Thêm event listener để đóng modal khi nhấn vào overlay
        modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    }
    
    // Hàm để phóng to ảnh trong gallery
    function expandImage(src) {
        const modalImg = document.getElementById('modalImage');
        modalImg.src = src;
        modalImg.style.display = 'block';
    }

    // Thêm hàm này vào phạm vi toàn cục
    window.closeModal = function() {
        const modal = document.getElementById('imageModal');
        modal.style.display = "none";
    }

    // Thêm đoạn code này vào cuối file hoặc trong hàm init của bạn
    document.addEventListener('DOMContentLoaded', function() {
        const closeButton = document.querySelector('.close');
        if (closeButton) {
            closeButton.addEventListener('click', closeModal);
        }
    });

    function updateTransportStatus(batchId, action) {
        fetch('/api/accept-transport', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ batchId, action })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                // Refresh batch info
                fetchBatchInfo(batchInfo.sscc);
            } else {
                alert('Lỗi: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi cập nhật trạng thái vận chuyển');
        });
    }
});

// Định nghĩa các hàm này ở phạm vi toàn cục
window.openImageGallery = function(type) {
    console.log('Opening gallery for:', type);
    console.log('Batch Info:', batchInfo);
    const modal = document.getElementById('imageModal');
    const modalContent = document.getElementById('modalContent');
    modal.style.display = "block";
    
    let galleryHTML = '<div class="image-gallery">';
    const images = type === 'product' ? batchInfo.productImageUrls : batchInfo.batchImageUrls;
    
    console.log('Images:', images);
    
    if (images && Object.keys(images).length > 0) {
        Object.values(images).forEach(url => {
            console.log('Adding image:', url);
            galleryHTML += `<img src="${url}" alt="${type} image" class="gallery-image" onclick="expandImage('${url}')">`;
        });
    } else {
        galleryHTML += '<p>Không có hình ảnh để hiển thị.</p>';
    }
    
    galleryHTML += '</div>';
    modalContent.innerHTML = galleryHTML;

    // Thêm event listener để đóng modal khi nhấn vào overlay
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

window.openImageModal = function(src) {
    console.log('Opening modal for:', src);
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modal.style.display = "block";
    modalImg.src = src;

    // Thêm event listener để đóng modal khi nhấn vào overlay
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

window.expandImage = function(src) {
    const modalImg = document.getElementById('modalImage');
    modalImg.src = src;
    modalImg.style.display = 'block';
}

window.acceptTransport = function(batchId) {
    // ... giữ nguyên nội dung hàm này
}
