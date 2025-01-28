// Hiển thị ảnh lớn khi click vào ảnh nhỏ
function showImage(img) {
  var overlay = document.getElementById("overlay");
  var overlayImg = document.getElementById("overlay-img");
  overlayImg.src = img.src;
  overlay.classList.add("active");
}

function hideImage() {
  var overlay = document.getElementById("overlay");
  overlay.classList.remove("active");
}

//Tải hình ảnh chứng chỉ
function downloadImage(button) {
  const imgUrl = button.getAttribute("data-url");

  axios({
    url: imgUrl,
    method: "GET",
    responseType: "blob",
  })
    .then((response) => {
      if (response.status === 200) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "image.jpg");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Error: Received non-200 status code");
      }
    })
    .catch((error) => {
      console.error("Error downloading the image:", error);
    });
}

//Tìm kiếm không cần ấn Enter
$(document).ready(function () {
  $("#myInput").on("keyup", function () {
    var value = $(this).val().toLowerCase();
    $("#d-table tr").filter(function () {
      $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
    });
  });
});

//Dropbox lọc trạng thái xử lý lô hàng
function searchFilter() {
  document.getElementById("filterDropdown").classList.toggle("show");
}

//Popup thông báo
function notificationPopup() {
  document.getElementById("filterDropdown").classList.toggle("show");
}

// Hàm để xử lý sự kiện click cho các tab
function handleTabClick(event) {
  // Loại bỏ lớp 'active' khỏi tất cả các tab
  document
    .querySelectorAll(".tab-content")
    .forEach((tc) => tc.classList.remove("active"));
  // Thêm lớp 'active' vào tab được nhấn
  document
    .getElementById(event.currentTarget.dataset.target)
    .classList.add("active");
}

// Thêm sự kiện click cho từng tab
document.querySelectorAll(".col").forEach((col) => {
  col.addEventListener("click", handleTabClick);
});

function handleTabClick(event) {
  // Loại bỏ lớp 'active' khỏi tất cả các tab
  document
    .querySelectorAll(".tab-content")
    .forEach((tc) => tc.classList.remove("active"));
  document
    .querySelectorAll(".col")
    .forEach((col) => col.classList.remove("active"));
  // Thêm lớp 'active' vào tab được nhấn
  document
    .getElementById(event.currentTarget.dataset.target)
    .classList.add("active");
  event.currentTarget.classList.add("active");
}

// Thêm sự kiện click cho từng tab
document.querySelectorAll(".col").forEach((col) => {
  col.addEventListener("click", handleTabClick);
});

AOS.init({
  duration: 1000, // Thời gian animation
  once: true, // Chạy animation một lần khi scroll
});

document.getElementById("save-button").addEventListener("click", function () {
  // Submit form
  document.getElementById("profile-form").submit();
});

function toggleOverlay() {
  const overlay = document.getElementById("overlay");
  overlay.classList.toggle("active");
}

function notificationPopup() {
  const dropdown = document.getElementById("filterDropdown");
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

document.addEventListener("DOMContentLoaded", function () {
  const overlay = document.getElementById("overlay");
  const navbarNav = document.getElementById("navbarNav");
  const toggler = document.querySelector(".navbar-toggler");

  function closeNavbar() {
    if (navbarNav.classList.contains("show")) {
      navbarNav.classList.remove("show");
      toggler.classList.add("collapsed");
    }
  }

  // Khi nhấp vào nút toggler, chuyển đổi overlay
  toggler.addEventListener("click", function () {
    toggleOverlay();
  });

  // Khi nhấp vào lớp phủ, đóng navbar và ẩn lớp phủ
  overlay.addEventListener("click", function () {
    closeNavbar();
    overlay.classList.remove("active");
  });

  // Khi nhấp vào liên kết trong navbar, đóng lớp phủ
  navbarNav.addEventListener("click", function (event) {
    if (event.target.matches("a")) {
      closeNavbar();
      overlay.classList.remove("active");
    }
  });
});


