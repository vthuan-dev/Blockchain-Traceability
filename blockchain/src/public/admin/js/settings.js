function saveSettings() {
    const language = document.getElementById('language').value;
    const backgroundColor = document.getElementById('background-color').value;

    localStorage.setItem('language', language);
    localStorage.setItem('backgroundColor', backgroundColor);

    applySettings();
}

function applySettings() {
    const language = localStorage.getItem('language') || 'vi';
    const backgroundColor = localStorage.getItem('backgroundColor') || 'bg-light';

    document.documentElement.lang = language;
    document.body.className = backgroundColor;

    // Cập nhật giá trị trong form nếu đang ở trang cài đặt
    const languageSelect = document.getElementById('language');
    const backgroundColorSelect = document.getElementById('background-color');
    
    if (languageSelect) languageSelect.value = language;
    if (backgroundColorSelect) backgroundColorSelect.value = backgroundColor;
}

// Áp dụng cài đặt khi trang được tải
document.addEventListener('DOMContentLoaded', applySettings);

// Thêm event listener cho select màu nền
if (document.getElementById('background-color')) {
    document.getElementById('background-color').addEventListener('change', previewBackgroundColor);
}

function previewBackgroundColor() {
    const backgroundColor = document.getElementById('background-color').value;
    document.body.className = backgroundColor;
}