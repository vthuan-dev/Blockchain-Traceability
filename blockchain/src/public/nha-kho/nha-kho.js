let batchInfo;
let html5QrCode;
let isConfirming = false;
let startCameraButton;
let qrInput;
let fileSelected;
let scanButton;
let qrReader;

// Thêm biến toàn cục để theo dõi gallery
let currentGalleryImages = [];
let currentImageIndex = 0;

function displayBatchInfo(info) {
  console.log("Displaying batch info:", info);
  const batchInfoDiv = document.getElementById("batchInfo");
  const batchDetailsDiv = document.getElementById("batchDetails");
  const warehouseActionsDiv = document.getElementById("warehouseActions");

  let tableHTML = '<table class="batch-info-table">';

  const addRow = (label, value, className = "") => {
    tableHTML += `
            <tr>
                <th>${label}</th>
                <td class="${className}">${value}</td>
            </tr>
        `;
  };

  addRow(
    "Trạng thái",
    `<span class="status-approved"><i class="fas fa-check-circle"></i> ${info.status}</span>`
  );
  addRow("Mã Lô hàng", info.batchId);
  addRow("Tên lô hàng", info.name);
  addRow("Số lượng (tấn)", info.quantity);
  addRow(
    "Ngày tạo lô hàng",
    new Date(info.productionDate).toLocaleDateString()
  );
  addRow("Trạng thái vận chuyển", info.transportStatus);
  addRow("Người sản xuất", info.producer.name);
  addRow("Địa chỉ", info.producer.address);
  addRow("Số điện thoại", info.producer.phone);

  // Hiển thị nút xem hình ảnh sản phẩm
  if (info.productImageUrls && Object.keys(info.productImageUrls).length > 0) {
    const imageCount = Object.keys(info.productImageUrls).length;
    addRow(
      "Hình ảnh sản phẩm",
      `<button class="btn btn-primary" onclick="openImageGallery('product')">Xem ${imageCount} ảnh sản phẩm</button>`
    );
  }

  // Hiển thị nút xem giấy chứng nhận
  if (info.certificateImageUrl) {
    addRow(
      "Giấy chứng nhận",
      `<button class="btn btn-primary" onclick="openImageModal('${info.certificateImageUrl}')">Xem giấy chứng nhận</button>`
    );
  }

  console.log("Transport Status:", info.transportStatus);
  console.log("Detailed Transport Status:", info.detailedTransportStatus);
  console.log("Warehouse Confirmed:", info.warehouseConfirmed);

  // Điều chỉnh logic hiển thị nút xác nhận
  if (
    info.transportStatus === "Đã vận chuyển" &&
    info.detailedTransportStatus === "Đã giao" &&
    info.warehouseConfirmed === false
  ) {
    const confirmButton = `<button onclick="confirmReceipt('${info.sscc}')" class="btn btn-primary mt-3">Xác nhận nhận hàng</button>`;
    tableHTML += `<tr><td colspan="2">${confirmButton}</td></tr>`;
  } else if (info.warehouseConfirmed === true) {
    tableHTML += `
      <tr>
        <td colspan="2">
          <div class="confirmation-status">
            <i class="fas fa-check-circle"></i>
            Lô hàng đã được xác nhận
          </div>
        </td>
      </tr>`;
  } else {
    tableHTML +=
      '<tr><td colspan="2"><p class="mt-3">Lô hàng chưa sẵn sàng để xác nhận</p></td></tr>';
  }

  tableHTML += "</table>";

  if (batchDetailsDiv) {
    batchDetailsDiv.innerHTML = tableHTML;
    batchInfoDiv.style.display = "block";
  } else {
    console.error("batchDetailsDiv not found");
  }
}

async function fetchBatchInfoBySSCC(sscc) {
  try {
    const response = await fetch(`/api/batch-info-by-sscc/${sscc}`);
    if (!response.ok) {
      throw new Error("Không thể lấy thông tin lô hàng");
    }
    batchInfo = await response.json();
    console.log("Received batch info:", batchInfo); // Log toàn bộ thông tin nhận được
    displayBatchInfo(batchInfo);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin lô hàng:", error);
    alert("Có lỗi xảy ra khi lấy thông tin lô hàng. Vui lòng thử lại.");
  }
}
async function confirmReceipt(sscc) {
  console.log("Xác nhận nhận hàng cho SSCC:", sscc);
  try {
    const response = await fetch("/api/warehouse-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sscc }),
    });
    console.log("Phản hồi đầy đủ:", response);
    const data = await response.json();
    console.log("Dữ liệu phản hồi:", data);

    if (response.ok) {
      // Cập nhật UI để hiển thị xác nhận thành công và ẩn nút xác nhận
      const batchDetailsDiv = document.getElementById("batchDetails");
      const confirmButton = batchDetailsDiv.querySelector(
        'button[onclick^="confirmReceipt"]'
      );
      if (confirmButton) {
        confirmButton.remove(); // Xóa nút xác nhận
      }
      // Thêm thông báo thành công
      const successMessage = document.createElement("p");
      successMessage.className = "text-success mt-3";
      successMessage.innerHTML =
        '<i class="fas fa-check-circle"></i> Xác nhận nhận hàng thành công';
      batchDetailsDiv.appendChild(successMessage);

      // Cập nhật đối tượng batchInfo cục bộ
      batchInfo.warehouseConfirmed = true;
    } else {
      console.error("Lỗi khi xác nhận nhận hàng:", data.error);
      // Hiển thị thông báo lỗi trong UI
      const errorMessage = document.createElement("p");
      errorMessage.className = "text-danger mt-3";
      errorMessage.textContent = "Lỗi: " + data.error;
      document.getElementById("batchDetails").appendChild(errorMessage);
    }
  } catch (error) {
    console.error("Lỗi khi xác nhận nhận hàng:", error);
    // Hiển thị thông báo lỗi trong UI
    const errorMessage = document.createElement("p");
    errorMessage.className = "text-danger mt-3";
    errorMessage.textContent = "Có lỗi xảy ra khi xác nhận nhận hàng";
    document.getElementById("batchDetails").appendChild(errorMessage);
  }
}

function openImageModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    
    // Chuẩn hóa đường dẫn
    imageUrl = decodeURIComponent(imageUrl); // Giải mã URL nếu đã bị mã hóa
    imageUrl = imageUrl.replace(/\\/g, '/');
    
    // Tách năm và tháng từ đường dẫn
    const match = imageUrl.match(/(\d{4})\/(\d{1,2})/);
    const year = match ? match[1] : new Date().getFullYear();
    const month = match ? match[2] : (new Date().getMonth() + 1);
    
    // Tách tên file
    const fileName = imageUrl.split('/').pop();
    
    // Tạo đường dẫn mới với cấu trúc chính xác
    imageUrl = `/uploads/batches/${year}/${month}/${fileName}`;

    console.log('Loading image from:', imageUrl); // Debug log

    modalImage.onerror = function() {
        console.error('Failed to load image:', imageUrl);
        alert('Không thể tải hình ảnh. Vui lòng thử lại sau.');
    };

    modalImage.onload = function() {
        console.log('Image loaded successfully');
        modal.style.display = "block";
    };

    // Set src sau khi đã thiết lập handlers
    modalImage.src = imageUrl;
}

function openImageGallery(type) {
    const modal = document.getElementById('imageGalleryModal');
    const galleryImage = document.getElementById('galleryCurrentImage');
    
    if (!modal || !galleryImage) {
        console.error("Modal elements not found");
        return;
    }

    // Lấy danh sách ảnh
    const images = type === 'product' ? 
        (batchInfo.productImageUrls ? Object.values(batchInfo.productImageUrls) : []) : 
        (batchInfo.batchImageUrls ? Object.values(batchInfo.batchImageUrls) : []);

    if (images.length === 0) {
        alert('Không có hình ảnh để hiển thị.');
        return;
    }

    // Lưu danh sách ảnh và reset index
    currentGalleryImages = images;
    currentImageIndex = 0;

    // Hiển thị ảnh đầu tiên
    updateGalleryView();
    
    // Hiển thị modal
    modal.style.display = "block";

    // Cập nhật số lượng ảnh
    document.getElementById('totalImages').textContent = images.length;

    // Ẩn/hiện nút điều hướng nếu chỉ có 1 ảnh
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    if (images.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    }

    // Thêm sự kiện bàn phím
    document.addEventListener('keydown', handleGalleryKeyPress);
}

function navigateGallery(direction) {
    currentImageIndex = (currentImageIndex + direction + currentGalleryImages.length) % currentGalleryImages.length;
    updateGalleryView();
}

function updateGalleryView() {
    const galleryImage = document.getElementById('galleryCurrentImage');
    const currentIndexSpan = document.getElementById('currentImageIndex');
    
    let imageUrl = currentGalleryImages[currentImageIndex];
    
    // Chuẩn hóa đường dẫn
    imageUrl = decodeURIComponent(imageUrl);
    imageUrl = imageUrl.replace(/\\/g, '/');
    
    // Tách năm và tháng từ đường dẫn
    const match = imageUrl.match(/(\d{4})\/(\d{1,2})/);
    const year = match ? match[1] : new Date().getFullYear();
    const month = match ? match[2] : (new Date().getMonth() + 1);
    
    // Tách tên file
    const fileName = imageUrl.split('/').pop();
    
    // Tạo đường dẫn mới với cấu trúc chính xác
    imageUrl = `/uploads/batches/${year}/${month}/${fileName}`;

    galleryImage.src = imageUrl;
    currentIndexSpan.textContent = currentImageIndex + 1;
}

function handleGalleryKeyPress(event) {
    if (event.key === 'ArrowLeft') {
        navigateGallery(-1);
    } else if (event.key === 'ArrowRight') {
        navigateGallery(1);
    } else if (event.key === 'Escape') {
        closeModal();
    }
}

function closeModal() {
    const modal = document.getElementById('imageGalleryModal');
    modal.style.display = 'none';
    // Xóa event listener khi đóng modal
    document.removeEventListener('keydown', handleGalleryKeyPress);
}

// Cập nhật event listeners
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('imageGalleryModal');
    const modalOverlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.close');

    modalOverlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    // Ngăn chặn sự kiện click từ việc lan truyền khi nhấp vào nội dung modal
    const modalContent = modal.querySelector('.modal-content');
    modalContent.addEventListener('click', function(event) {
        event.stopPropagation();
    });
});

// Event listener cho DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  startCameraButton = document.getElementById("start-camera");
  qrInput = document.getElementById("qr-input");
  fileSelected = document.getElementById("file-selected");
  scanButton = document.getElementById("scan-button");
  qrReader = document.getElementById("qr-reader");

  if (startCameraButton) {
    startCameraButton.addEventListener("click", async function() {
      // Nếu đang quét, dừng quét
      if (html5QrCode && html5QrCode.isScanning) {
        stopScanner();
        return;
      }
      
      // Nếu chưa quét, bắt đầu quét
      try {
        // Yêu cầu quyền camera khi nhấn nút này
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        // Dừng stream ngay sau khi được cấp quyền
        stream.getTracks().forEach(track => track.stop());
        
        // Bắt đầu quét sau khi được cấp quyền
        startScanner();
      } catch (err) {
        console.error("Camera permission error:", err);
        alert('Vui lòng cấp quyền camera trong cài đặt trình duyệt của bạn.');
      }
    });
  }
  
  if (qrInput) {
    qrInput.addEventListener("change", handleFileInput);
  }
  if (scanButton) {
    scanButton.addEventListener("click", scanQR);
  }

  async function startScanner() {
    try {
      // Khởi tạo scanner trước
      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
      }
      qrReader.style.display = "block";

      // Thử camera sau trước
      await html5QrCode.start(
        { facingMode: { exact: "environment" } },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          console.log("QR Code detected:", decodedText);
          stopScanner();
          handleQRCode(decodedText);
        },
        (errorMessage) => {
          console.log("QR Error:", errorMessage);
        }
      );

      // Đổi text của nút thành "Dừng quét"
      startCameraButton.textContent = "Dừng quét";
      scanButton.disabled = true;

    } catch (err) {
      console.error("Back camera error:", err);
      
      // Thử camera trước nếu camera sau không được
      try {
        await html5QrCode.start(
          { facingMode: "user" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            console.log("QR Code detected:", decodedText);
            stopScanner();
            handleQRCode(decodedText);
          }
        );
        
        // Đổi text của nút thành "Dừng quét"
        startCameraButton.textContent = "Dừng quét";
        scanButton.disabled = true;
        
      } catch (frontErr) {
        console.error("Front camera error:", frontErr);
        alert("Không thể truy cập camera. Vui lòng kiểm tra quyền và thử lại.");
        await stopScanner();
      }
    }
  }

  async function stopScanner() {
    try {
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          await html5QrCode.stop();
          console.log("Scanner stopped");
        }
        await html5QrCode.clear();
        html5QrCode = null;
      }
      qrReader.style.display = "none";
      startCameraButton.textContent = "Quét QR bằng camera";
      scanButton.disabled = false;
    } catch (err) {
      console.error("Stop scanner error:", err);
    }
  }

  function handleFileInput(event) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // Giới hạn 5MB
        alert("File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.");
        return;
      }
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        alert(
          "Định dạng file không hỗ trợ. Vui lòng chọn file JPEG, PNG hoặc GIF."
        );
        return;
      }
      fileSelected.style.display = "block";
      scanButton.disabled = false;
    } else {
      fileSelected.style.display = "none";
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
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleQRCode(code.data);
        } else {
          console.error("Không tìm thấy mã QR trong ảnh");
          alert(
            "Không tìm thấy mã QR trong ảnh. Vui lòng thử lại với ảnh khác."
          );
        }
      };
      img.src = event.target.result;
    };
    reader.onerror = function () {
      console.error("Lỗi khi đọc file");
      alert("Có lỗi xảy ra khi đọc file. Vui lòng thử lại.");
    };
    reader.readAsDataURL(file);
  }

  function handleQRCode(decodedText) {
    console.log("Đã phát hiện mã QR:", decodedText);
    // Hiển thị loading spinner
    showLoadingSpinner();
    
    // Trích xuất SSCC từ URL
    const sscc = extractSSCC(decodedText);
    if (sscc) {
        console.log("Đã trích xuất SSCC:", sscc);
        fetchBatchInfoBySSCC(sscc)
            .finally(() => {
                // Ẩn loading spinner khi hoàn thành (dù thành công hay thất bại)
                hideLoadingSpinner();
            });
    } else {
        console.error("Không thể trích xuất SSCC từ URL:", decodedText);
        alert("Mã QR không hợp lệ hoặc không chứa SSCC");
        hideLoadingSpinner();
    }
  }

  function showLoadingSpinner() {
    if (!document.getElementById('loadingSpinner')) {
        const spinner = document.createElement('div');
        spinner.id = 'loadingSpinner';
        spinner.className = 'loading-spinner';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    }
    document.getElementById('loadingSpinner').style.display = 'block';
  }

  function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
  }

  function extractSSCC(url) {
    // Kiểm tra nếu url chứa '/batch/'
    if (url.includes("/batch/")) {
      // Lấy phần cuối cùng của URL sau '/batch/'
      const parts = url.split("/batch/");
      return parts[parts.length - 1];
    }
    // Nếu không, tìm kiếm tham số sscc trong URL
    const match = url.match(/sscc=([^&]+)/);
    return match ? match[1] : null;
  }

  const closeButton = document.querySelector(".close");
  if (closeButton) {
    closeButton.addEventListener("click", closeModal);
  }

  const completionMessage = localStorage.getItem("transportCompletionMessage");
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

