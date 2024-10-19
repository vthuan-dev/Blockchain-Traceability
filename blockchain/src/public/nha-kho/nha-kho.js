let batchInfo;
let html5QrCode;
let isConfirming = false;

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
    tableHTML +=
      '<tr><td colspan="2"><p class="mt-3">Lô hàng đã được xác nhận</p></td></tr>';
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

function openImageModal(src) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const modalContent = document.getElementById("modalContent");
  const modalOverlay = modal.querySelector(".modal-overlay");

  modal.style.display = "block";
  modalImg.src = src;
  modalImg.style.display = "block";
  modalContent.style.display = "none";

  // Đóng modal khi nhấp vào bất kỳ đâu trên modal
  modal.onclick = function (event) {
    if (event.target === modal || event.target.className === "modal-overlay") {
      closeModal();
    }
  };

  // Ngăn chặn sự kiện click từ việc lan truyền đến overlay khi nhấp vào ảnh
  modalImg.onclick = function (event) {
    event.stopPropagation();
  };
}

function openImageGallery(type) {
  console.log("Opening gallery for:", type);
  console.log("Batch Info:", batchInfo);
  const modal = document.getElementById("imageModal");
  const modalContent = document.getElementById("modalContent");

  if (!modal || !modalContent) {
    console.error("Modal elements not found");
    alert("Không thể hiển thị hình ảnh. Vui lòng thử lại sau.");
    return;
  }

  modal.style.display = "block";

  let galleryHTML = '<div class="image-gallery">';
  const images =
    type === "product" ? batchInfo.productImageUrls : batchInfo.batchImageUrls;

  console.log("Images:", images);

  if (images && Object.keys(images).length > 0) {
    Object.values(images).forEach((url) => {
      console.log("Adding image:", url);
      galleryHTML += `<img src="${url}" alt="${type} image" class="gallery-image" onclick="expandImage('${url}')">`;
    });
  } else {
    galleryHTML += "<p>Không có hình ảnh để hiển thị.</p>";
  }

  galleryHTML += "</div>";
  modalContent.innerHTML = galleryHTML;
  modalContent.style.display = "block";

  // Đóng modal khi nhấp vào bất kỳ đâu trên modal
  modal.onclick = function (event) {
    if (event.target === modal || event.target.className === "modal-overlay") {
      closeModal();
    }
  };
}

function expandImage(src) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const modalContent = document.getElementById("modalContent");

  modal.style.display = "block";
  modalImg.src = src;
  modalImg.style.display = "block";
  modalContent.style.display = "none";

  // Đóng modal khi nhấp vào bất kỳ đâu trên modal
  modal.onclick = function (event) {
    if (event.target === modal || event.target.className === "modal-overlay") {
      closeModal();
    }
  };
}

function closeModal() {
  const modal = document.getElementById("imageModal");
  modal.style.display = "none";
}

// Thêm event listener cho nút đóng và overlay
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("imageModal");
  const closeButton = modal.querySelector(".close");

  if (closeButton) {
    closeButton.addEventListener("click", closeModal);
  }

  // Đóng modal khi nhấp vào bất kỳ đâu trên modal
  modal.addEventListener("click", function (event) {
    if (event.target === modal || event.target.className === "modal-overlay") {
      closeModal();
    }
  });

  // Ngăn chặn sự kiện click từ việc lan truyền khi nhấp vào nội dung modal
  const modalContent = modal.querySelector(".modal-content");
  if (modalContent) {
    modalContent.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }
});

// Event listener cho DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  const startCameraButton = document.getElementById("start-camera");
  const qrInput = document.getElementById("qr-input");
  const fileSelected = document.getElementById("file-selected");
  const scanButton = document.getElementById("scan-button");
  const qrReader = document.getElementById("qr-reader");

  startCameraButton.addEventListener("click", toggleQRScanner);
  qrInput.addEventListener("change", handleFileInput);
  scanButton.addEventListener("click", scanQR);

  function toggleQRScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
      stopScanner();
    } else {
      startScanner();
    }
  }

  function startScanner() {
    html5QrCode = new Html5Qrcode("qr-reader");
    qrReader.style.display = "block";
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      console.log("QR Code from camera:", decodedText); // Thêm log để kiểm tra giá trị từ camera
      stopScanner();
      handleQRCode(decodedText);
    };
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode
      .start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
      .then(() => {
        console.log("QR Code scanning is started");
        startCameraButton.textContent = "Dừng quét";
        scanButton.disabled = true;
      })
      .catch((err) => {
        console.error(`Không thể bắt đầu quét QR: ${err}`);
        alert(
          "Không thể bắt đầu quét QR. Vui lòng kiểm tra quyền truy cập camera."
        );
      });
  }

  function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode
        .stop()
        .then(() => {
          console.log("QR Code scanning stopped.");
          startCameraButton.textContent = "Quét QR bằng camera";
          qrReader.style.display = "none";
          scanButton.disabled = false;
        })
        .catch((err) => {
          console.log("Unable to stop scanning.", err);
        });
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
    console.log("QR Code detected:", decodedText);
    // Trích xuất SSCC từ URL
    const sscc = extractSSCC(decodedText);
    if (sscc) {
      console.log("Extracted SSCC:", sscc);
      fetchBatchInfoBySSCC(sscc);
    } else {
      console.error("Không thể trích xuất SSCC từ URL:", decodedText);
      alert("Mã QR không hợp lệ hoặc không chứa SSCC");
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
