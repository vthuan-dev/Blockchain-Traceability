function saveSettings() {
  const language = document.getElementById("language").value;
  const theme = document.getElementById("background-color").value;

  localStorage.setItem("language", language);
  localStorage.setItem("theme", theme);

  applySettings();
}

function applySettings() {
  const language = localStorage.getItem("language") || "vi";
  const theme = localStorage.getItem("theme") || "light-theme";

  applyTheme(theme);
  document.documentElement.lang = language;
  updateThemeIcon();

  // Cập nhật giá trị trong form nếu đang ở trang cài đặt
  const languageSelect = document.getElementById("language");
  const themeSelect = document.getElementById("background-color");

  if (languageSelect) languageSelect.value = language;
  if (themeSelect) themeSelect.value = theme;
}

function previewSettings() {
  const language = document.getElementById("language").value;
  const theme = document.getElementById("background-color").value;

  applyTheme(theme);
  document.documentElement.lang = language;
}

function applyTheme(theme) {
  document.body.classList.remove("light-theme", "dark-theme");
  document.body.classList.add(theme);
}

function updateThemeIcon() {
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    const currentTheme = localStorage.getItem('theme') || 'light-theme';
    themeIcon.className = currentTheme === 'light-theme' ? 'fas fa-moon' : 'fas fa-sun';
  }
}

// Áp dụng cài đặt khi trang được tải
document.addEventListener("DOMContentLoaded", applySettings);

// Thêm event listener cho select theme và ngôn ngữ
if (document.getElementById("background-color")) {
  document
    .getElementById("background-color")
    .addEventListener("change", previewSettings);
}

if (document.getElementById("language")) {
  document
    .getElementById("language")
    .addEventListener("change", previewSettings);
}

// Thêm event listener cho icon theme
document.addEventListener('DOMContentLoaded', function() {
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    updateThemeIcon();
    themeIcon.addEventListener('click', function() {
      const currentTheme = localStorage.getItem('theme') || 'light-theme';
      const newTheme = currentTheme === 'light-theme' ? 'dark-theme' : 'light-theme';
      
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
      updateThemeIcon();
    });
  }
});

// Trong trang cài đặt, thêm event listener cho form submit
if (document.querySelector(".settings-form")) {
  document
    .querySelector(".settings-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      saveSettings();
      showMessage("Đã lưu thay đổi thành công!", "success");
    });
}
