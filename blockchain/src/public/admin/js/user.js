const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : 'http://www.tsroreee.com/api';
// Tạo một đối tượng toàn cục để chứa các hàm và biến
window.UserManager = {
  userData: [],
  filteredData: [],
  currentPage: 1,
  rowsPerPage: 5, // Đặt giá trị mặc định là 5

  formatDate: function (dateString) {
    return formatDate(dateString); // Sử dụng hàm từ feature.js
  },

  getRole: function (roleId) {
    switch (roleId) {
      case 1:
        return "Nhà sản xuất";
      case 2:
        return "Nhà kiểm duyệt";
      case 6:
        return "Vận chuyển";
      case 8:
        return "Nhà kho";
      default:
        return "Không xác định";
    }
  },

  getApproved: function (approved) {
    return approved === 1 ? "Đã xác thực" : "Chưa xác thực";
  },

  getRegionId: function (regionId) {
    return regionId === null ? "N/A" : regionId;
  },

  getAvatarPath: function (avatarPath) {
    if (!avatarPath) return "uploads/avatars/default-avatar.png"; // Đường dẫn mặc định nếu không có avatar
    return avatarPath; // Trả về trực tiếp URL từ Firebase
  },

  renderTable: function () {
    const tbody = document.querySelector(".table tbody");
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.rowsPerPage;
    const end = start + this.rowsPerPage;
    const paginatedData = this.filteredData.slice(start, end);

    tbody.innerHTML = "";

    if (this.filteredData.length === 0) {
      const emptyRow = `
                <tr>
                    <td colspan="13" class="text-center">Không tìm thấy kết quả phù hợp</td>
                </tr>
            `;
      tbody.innerHTML = emptyRow;
      this.updatePagination();
      return;
    }

    paginatedData.forEach((user) => {
      const avatarPath = this.getAvatarPath(user.avatar);
      const row = `
                <tr>
                    <td style="text-align: center; vertical-align: middle;">${
                      user.uid
                    }</td>
                    <td style="text-align: center; vertical-align: middle;">${
                      user.phone
                    }</td>
                    <td style="text-align: center; vertical-align: middle;">${
                      user.name
                    }</td>
                    <td style="text-align: center; vertical-align: middle;">${
                      user.email
                    }</td>
                    <td style="text-align: center; vertical-align: middle;"><img src="${avatarPath}" alt="Avatar" class="user-avatar" style="width: 50px; height: 50px; object-fit: cover; border-radius: 50%;"></td>
                    <td style="text-align: center; vertical-align: middle; min-width: 250px; max-width: 300px; white-space: normal; word-wrap: break-word;">${
                      user.address
                    }</td>
                    <td style="text-align: center; vertical-align: middle;">${
                      this.getRegionId(user.region_id)
                    }</td>
                    <td style="text-align: center; vertical-align: middle;">${this.formatDate(
                      user.dob
                    )}</td>
                    <td style="text-align: center; vertical-align: middle;">${
                      user.gender
                    }</td>
                    <td style="text-align: center; vertical-align: middle;">${this.formatDate(
                      user.created_at
                    )}</td>
                    <td style="text-align: center; vertical-align: middle;">${this.getRole(
                      user.role_id
                    )}</td>
                    <td style="text-align: center; vertical-align: middle;">${this.getApproved(
                      user.is_approved
                    )}</td>
                    <td style="text-align: center; vertical-align: middle;">
                        <button class="action-icons bg-red" title="Xóa"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
      tbody.insertAdjacentHTML("beforeend", row);
    });

    this.updatePagination();
  },

  updatePagination: function () {
    updatePagination(this.currentPage, this.rowsPerPage, this.filteredData); // Sử dụng hàm từ feature.js
  },

  fetchUserData: async function () {
    try {
      const url = `${baseUrl}/users`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Lỗi khi tải dữ liệu");
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu không đúng định dạng");
      }
      this.userData = data;
      this.filteredData = [...this.userData];
      console.log("Dữ liệu người dùng:", this.userData);
      this.renderTable();
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu người dùng:", error);
    }
  },

  initializeRowsPerPage: function () {
    const entriesSelect = document.querySelector(".entries-select");
    if (entriesSelect) {
      this.rowsPerPage = parseInt(entriesSelect.value);
    }
  },

  deleteUser: async function (userId) {
    try {
      const url = `${baseUrl}/users/${userId}`;
      const response = await fetch(
        url,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Lỗi khi xóa người dùng");
      }
      await response.json();
      showMessage("Người dùng đã được xóa thành công", "success");
      this.fetchUserData();
    } catch (error) {
      console.error("Lỗi khi xóa người dùng:", error);
      showMessage(
        "Có lỗi xảy ra khi xóa người dùng: " + error.message,
        "error"
      );
    }
  },
};

document.addEventListener("DOMContentLoaded", function () {
  const table = document.querySelector(".table");
  const searchInput = document.getElementById("search-input");
  const entriesSelect = document.querySelector(".entries-select");
  const prevButton = document.getElementById("prevPage");
  const nextButton = document.getElementById("nextPage");
  const removePanel = document.querySelector(".remove");
  const overlay = document.getElementById("overlay");
  const mainContent = document.querySelector("main");

  function showPanel(panel) {
    showPanel(panel); // Sử dụng hàm từ feature.js
  }

  function hidePanel(panel) {
    hidePanel(panel); // Sử dụng hàm từ feature.js
  }

  // Event Listeners
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(() => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        window.UserManager.filteredData = window.UserManager.userData.filter(
          (user) =>
            Object.values(user).some((value) =>
              String(value).toLowerCase().includes(searchTerm)
            )
        );
        window.UserManager.currentPage = 1;
        window.UserManager.renderTable();
      }, 300)
    );
  }

  if (entriesSelect) {
    entriesSelect.addEventListener("change", () => {
      window.UserManager.rowsPerPage = parseInt(entriesSelect.value);
      window.UserManager.currentPage = 1;
      window.UserManager.renderTable();
    });
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      if (window.UserManager.currentPage > 1) {
        window.UserManager.currentPage--;
        window.UserManager.renderTable();
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      const totalPages = Math.ceil(
        window.UserManager.filteredData.length / window.UserManager.rowsPerPage
      );
      if (window.UserManager.currentPage < totalPages) {
        window.UserManager.currentPage++;
        window.UserManager.renderTable();
      }
    });
  }

  if (table) {
    const tbody = table.querySelector("tbody");
    if (tbody) {
      tbody.addEventListener("click", function (e) {
        if (e.target.closest(".fa-trash-alt")) {
          const row = e.target.closest("tr");
          const userId = row.cells[0].textContent;
          showDeleteConfirmation(userId, "user");
        }
      });
    }
  }

  const cancelRemoveButton = document.getElementById("cancel-remove");
  if (cancelRemoveButton) {
    cancelRemoveButton.addEventListener("click", function (event) {
      event.preventDefault();
      hidePanel(removePanel);
    });
  }

  // Khởi tạo bảng
  if (table) {
    window.UserManager.fetchUserData();
  }

  // Khởi tạo giá trị rowsPerPage từ select
  window.UserManager.initializeRowsPerPage();

  const addAdminForm = document.querySelector(".add-admin-form");
  if (addAdminForm) {
    addAdminForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const email = document.getElementById("admin-email").value;
      const name = document.getElementById("admin-name").value;
      const password = document.getElementById("admin-password").value;
      const confirmPassword = document.getElementById(
        "admin-confirm-password"
      ).value;

      if (password !== confirmPassword) {
        showMessage("Mật khẩu xác nhận không khớp", "error");
        return;
      }

      // Lấy province_id từ session
      const url = `${baseUrl}/user-info`;
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          const province_id = data.province_id;
          
          const adminUrl = `${baseUrl}/admin`;
          fetch(adminUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, name, password, province_id }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.error) {
                showMessage("Lỗi: " + data.error, "error");
              } else {
                showMessage("Admin đã được thêm thành công", "success");
                window.location.href = "user.html";
              }
            })
            .catch((error) => {
              console.error("Lỗi:", error);
              showMessage("Đã xảy ra lỗi khi thêm admin", "error");
            });
        })
        .catch((error) => {
          console.error("Lỗi khi lấy thông tin người dùng:", error);
          showMessage("Đã xảy ra lỗi khi lấy thông tin người dùng", "error");
        });
    });
  }
});
