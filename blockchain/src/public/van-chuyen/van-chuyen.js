// Khai báo các hàm ở phạm vi toàn cục
let batchInfo;
let html5QrCode = null;
let startCameraButton;
let qrInput;
let fileSelected;
let scanButton;
let qrReader;

// Thêm các hàm này vào đầu file, sau các khai báo biến toàn cục
function translateAction(action) {
  const actions = {
    0: "Bắt đầu vận chuyển",
    1: "Tạm dừng vận chuyển",
    2: "Tiếp tục vận chuyển",
    3: "Hoàn thành vận chuyển",
  };
  return actions[action] || action;
}

function translateParticipantType(type) {
  const types = {
    0: "Người vận chuyển",
    1: "Kho",
  };
  return types[type] || type;
}

async function displayTransportHistory(sscc) {
  try {
    const response = await fetch(`/api/batch-transport-history/${sscc}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const history = await response.json();

    console.log("Transport History:", history);

    if (!Array.isArray(history)) {
      throw new Error("Lịch sử vận chuyển không phải là một mảng");
    }

    let historyHTML =
      '<h3>Lịch sử vận chuyển</h3><ul class="transport-history">';
    history.forEach((event) => {
      // Xử lý địa chỉ để loại bỏ phần trùng lặp
      const addressParts = event.transporterAddress.split(", ");
      const uniqueAddressParts = [...new Set(addressParts)];
      const formattedAddress = uniqueAddressParts.join(", ");

      historyHTML += `
                <li class="transport-event">
                    <div class="event-details">
                        <strong>Hành động:</strong> ${event.action}<br>
                        <strong>Thời gian:</strong> ${event.timestamp}<br>
                        <strong>Loại người tham gia:</strong> ${
                          event.participantType
                        }<br>
                    </div>
                    <div class="transporter-info">
                        <strong>Người vận chuyển:</strong> ${
                          event.transporterName || "Không có thông tin"
                        }<br>
                        <strong>Số điện thoại:</strong> ${
                          event.transporterPhone || "Không có thông tin"
                        }<br>
                        <strong>Địa chỉ:</strong> ${
                          formattedAddress || "Không có thông tin"
                        }
                    </div>
                </li>
            `;
    });
    historyHTML += "</ul>";

    const transportHistoryElement = document.getElementById("transportHistory");
    if (transportHistoryElement) {
      transportHistoryElement.innerHTML = historyHTML;
    } else {
      console.error('Element with id "transportHistory" not found');
    }
  } catch (error) {
    console.error("Error displaying transport history:", error);
    alert("Không thể lấy lịch sử vận chuyển. Vui lòng thử lại.");
  }
}

function displayBatchInfo(info) {
  console.log("Displaying batch info:", info);
  const batchInfoDiv = document.getElementById("batchInfo");
  const batchDetailsDiv = document.getElementById("batchDetails");

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

  tableHTML += "</table>";

  // Thêm nút cập nhật trạng thái vận chuyển
  let transportButton = "";
  if (info.detailedTransportStatus === "Chưa bắt đầu" || info.detailedTransportStatus === "Tạm dừng") {
    transportButton = `
      <button onclick="updateTransportStatus('${info.sscc}', 'Bat dau van chuyen')" class="btn btn-success mt-3">
        <span class="button-text">Bắt đầu vận chuyển</span>
        <div class="loading-spinner"></div>
      </button>`;
  } else if (info.detailedTransportStatus === "Đang vận chuyển") {
    transportButton = `
      <button onclick="updateTransportStatus('${info.sscc}', 'Tam dung van chuyen')" class="btn btn-warning mt-3">
        <span class="button-text">Tạm dừng vận chuyển</span>
        <div class="loading-spinner"></div>
      </button>
      <button onclick="updateTransportStatus('${info.sscc}', 'Hoan thanh van chuyen')" class="btn btn-success mt-3">
        <span class="button-text">Hoàn thành vận chuyển</span>
        <div class="loading-spinner"></div>
      </button>`;
  } else if (info.detailedTransportStatus === "Đã giao") {
    //khi đã giao thì không thể bắt đầu vận chuyển mới
    transportButton = `<button onclick="updateTransportStatus('${info.sscc}', 'Bat dau van chuyen')" class="btn btn-success mt-3">Bắt đầu vận chuyển mới</button>`;
  }

  tableHTML += transportButton;
  batchDetailsDiv.innerHTML = tableHTML;
  batchInfoDiv.style.display = "block";

  displayTransportHistory(info.sscc);
}

async function fetchBatchInfoBySSCC(sscc) {
  try {
    const response = await fetch(`/api/batch-info-by-sscc/${sscc}`);
    if (!response.ok) {
      throw new Error("Không thể lấy thông tin lô hàng");
    }
    batchInfo = await response.json();
    displayBatchInfo(batchInfo);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin lô hàng:", error);
    alert("Có lỗi xảy ra khi lấy thông tin lô hàng. Vui lòng thử lại.");
  }
}

function showCompletionModal() {
  const modal = document.getElementById("completionModal");
  modal.style.display = "block";
}

// Thêm hàm để đóng modal và làm mới trang
function closeCompletionModalAndRefresh() {
  const modal = document.getElementById("completionModal");
  modal.style.display = "none";
  location.reload(); // Làm mới trang
}

async function updateTransportStatus(sscc, action) {
  console.log("Updating transport status:", { sscc, action });
  
  // Tìm và thêm loading state cho nút được click
  const clickedButton = event.target.closest('button');
  clickedButton.classList.add('btn-loading');
  
  try {
    const response = await fetch("/api/accept-transport", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sscc, action }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không thể cập nhật trạng thái vận chuyển");
    }

    showActionMessage(data.message, "success");
    await fetchBatchInfoBySSCC(sscc);
  } catch (error) {
    console.error("Error:", error);
    showActionMessage(
      "Có lỗi xảy ra khi cập nhật trạng thái vận chuyển: " + error.message,
      "error"
    );
  } finally {
    // Xóa loading state
    clickedButton.classList.remove('btn-loading');
  }
}

// Cập nhật hàm showTransportCompletionMessage
function showTransportCompletionMessage() {
  const successMessage = document.createElement("div");
  successMessage.className = "alert alert-success mt-3";
  successMessage.innerHTML = `
        <h4 class="alert-heading">Vận chuyển thành công!</h4>
        <p>Bạn đã hoàn thành vận chuyển lô hàng này.</p>
        <hr>
        <p class="mb-0">Trang sẽ tự động tải lại sau 5 giây.</p>
    `;

    // Ẩn thông tin lô hàng và các nút hành động nếu có
    const batchInfoDiv = document.getElementById("batchInfo");
    const transportActionsDiv = document.getElementById("transportActions");
    if (batchInfoDiv) batchInfoDiv.style.display = "none";
    if (transportActionsDiv) transportActionsDiv.style.display = "none";

    // Chèn thông báo vào đầu trang
    const container = document.querySelector(".container");
    container.insertBefore(successMessage, container.firstChild);

    // Cuộn trang đến thông báo
    successMessage.scrollIntoView({ behavior: "smooth" });

    // Đợi 2 giây và sau đó tải lại trang
    setTimeout(() => {
      window.location.reload();
    }, 5000);
}

function openImageModal(src) {
  console.log("Opening modal for:", src);
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  modal.style.display = "block";
  modalImg.src = src;

  // Thêm event listener để đóng modal khi nhấn vào overlay
  modal.querySelector(".modal-overlay").addEventListener("click", closeModal);
}

function openImageGallery(type) {
  console.log("Opening gallery for:", type);
  console.log("Batch Info:", batchInfo);
  const modal = document.getElementById("imageModal");
  const modalContent = document.getElementById("modalContent");
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

  // Thêm event listener để đóng modal khi nhấn vào overlay
  modal.querySelector(".modal-overlay").addEventListener("click", closeModal);
}

function expandImage(src) {
  const modalImg = document.getElementById("modalImage");
  modalImg.src = src;
  modalImg.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("imageModal");
  modal.style.display = "none";
}

// Event listener cho DOMContentLoaded
document.addEventListener("DOMContentLoaded", async function () {
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

function showActionMessage(message, type) {
  const actionMessage = document.getElementById("actionMessage");
  actionMessage.textContent = message;
  actionMessage.className = `action-message ${type}`;
  actionMessage.style.display = "block";

  // Force a reflow
  void actionMessage.offsetWidth;

  actionMessage.classList.add("show");

  setTimeout(() => {
    actionMessage.classList.remove("show");
    setTimeout(() => {
      actionMessage.style.display = "none";
    }, 300); // Đợi cho animation kết thúc
  }, 3000);
}



