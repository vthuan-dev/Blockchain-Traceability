let batchInfo;
let html5QrCode;


function displayBatchInfo(info) {
    console.log('Displaying batch info:', info);
    const batchInfoDiv = document.getElementById('batchInfo');
    const batchDetailsDiv = document.getElementById('batchDetails');
    const warehouseActionsDiv = document.getElementById('warehouseActions');
    
    let tableHTML = '<table class="batch-info-table">';
    
    const addRow = (label, value, className = '') => {
        tableHTML += `
            <tr>
                <th>${label}</th>
                <td class="${className}">${value}</td>
            </tr>
        `;
    };
   
    addRow('Trạng thái', `<span class="status-approved"><i class="fas fa-check-circle"></i> ${info.status}</span>`);
    addRow('Mã Lô hàng', info.batchId);
    addRow('Tên lô hàng', info.name);
    addRow('Số lượng (tấn)', info.quantity);
    addRow('Ngày tạo lô hàng', new Date(info.productionDate).toLocaleDateString());
    addRow('Trạng thái vận chuyển', info.transportStatus);
    addRow('Người sản xuất', info.producer.name);
    addRow('Địa chỉ', info.producer.address);
    addRow('Số điện thoại', info.producer.phone);

    // Hiển thị nút xem hình ảnh sản phẩm
    if (info.productImageUrls && Object.keys(info.productImageUrls).length > 0) {
        const imageCount = Object.keys(info.productImageUrls).length;
        addRow('Hình ảnh sản phẩm', `<button class="btn btn-primary" onclick="openImageGallery('product')">Xem ${imageCount} ảnh sản phẩm</button>`);
    }

    // Hiển thị nút xem giấy chứng nhận
    if (info.certificateImageUrl) {
        addRow('Giấy chứng nhận', `<button class="btn btn-primary" onclick="openImageModal('${info.certificateImageUrl}')">Xem giấy chứng nhận</button>`);
    }

    tableHTML += '</table>';

    if (batchDetailsDiv) {
        batchDetailsDiv.innerHTML = tableHTML;
        batchInfoDiv.style.display = 'block';
        warehouseActionsDiv.style.display = 'block';

        // Xóa nút xác nhận cũ nếu có
        const existingConfirmButton = warehouseActionsDiv.querySelector('button');
        if (existingConfirmButton) {
            existingConfirmButton.remove();
        }

        // Thêm nút xác nhận nhận hàng mới
        if (info.transportStatus === 'Đã vận chuyển' && info.detailedTransportStatus === 'Đã giao') {
            console.log('Conditions met for showing confirm button');
            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'Xác nhận nhận hàng';
            confirmButton.className = 'btn btn-primary mt-3';
            confirmButton.addEventListener('click', () => {
                console.log('Confirm button clicked');
                confirmReceipt(info.sscc);
            });
            warehouseActionsDiv.appendChild(confirmButton);
            console.log('Confirm button added');
        } else {
            console.log('Conditions not met for showing confirm button');
            console.log('Transport status:', info.transportStatus);
            console.log('Detailed transport status:', info.detailedTransportStatus);
        }
    } else {
        console.error('batchDetailsDiv not found');
    }
}


async function fetchBatchInfoBySSCC(sscc) {
    try {
        const response = await fetch(`/api/batch-info-by-sscc/${sscc}`);
        if (!response.ok) {
            throw new Error('Không thể lấy thông tin lô hàng');
        }
        batchInfo = await response.json();
        displayBatchInfo(batchInfo);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin lô hàng:', error);
        alert('Có lỗi xảy ra khi lấy thông tin lô hàng. Vui lòng thử lại.');
    }
}
async function confirmReceipt(sscc) {
    console.log('Confirming receipt for SSCC:', sscc);
    try {
        const response = await fetch('/api/warehouse-confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sscc: sscc })
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            alert('Đã xác nhận nhận hàng thành công');
            await fetchBatchInfoBySSCC(sscc);
        } else {
            alert(data.error || 'Có lỗi xảy ra khi xác nhận nhận hàng');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi xác nhận nhận hàng: ' + error.message);
    }
}

function openImageModal(src) {
    console.log('Opening modal for:', src);
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modal.style.display = "block";
    modalImg.src = src;

    // Thêm event listener để đóng modal khi nhấn vào overlay
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

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

function expandImage(src) {
    const modalImg = document.getElementById('modalImage');
    modalImg.src = src;
    modalImg.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = "none";
}

// Event listener cho DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
   
    
    const startCameraButton = document.getElementById('start-camera');
    const qrInput = document.getElementById('qr-input');
    const fileSelected = document.getElementById('file-selected');
    const scanButton = document.getElementById('scan-button');
    const qrReader = document.getElementById('qr-reader');

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
            console.log("QR Code from camera:", decodedText); // Thêm log để kiểm tra giá trị từ camera
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
        const parts = decodedText.split(':');
        if (parts.length === 2 && parts[0] === 'SSCC') {
            const sscc = parts[1];
            console.log("Extracted SSCC:", sscc); // Thêm log để kiểm tra giá trị SSCC
            fetchBatchInfoBySSCC(sscc);
        } else {
            alert('Mã QR không hợp lệ');
        }
    }

    const closeButton = document.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }


    const completionMessage = localStorage.getItem('transportCompletionMessage');
    if (completionMessage) {
        showTransportCompletionMessage();
    }
});

// Gán các hàm cần thiết cho window object
window.displayBatchInfo = displayBatchInfo;
window.fetchBatchInfoBySSCC = fetchBatchInfoBySSCC;
window.updateTransportStatus = updateTransportStatus;
window.openImageModal = openImageModal;
window.openImageGallery = openImageGallery;

window.expandImage = expandImage;
window.closeModal = closeModal;
window.confirmReceipt = confirmReceipt;
