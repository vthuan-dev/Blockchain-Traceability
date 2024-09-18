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

    applyTheme(backgroundColor);
    document.documentElement.lang = language;

    // Cập nhật giá trị trong form nếu đang ở trang cài đặt
    const languageSelect = document.getElementById('language');
    const backgroundColorSelect = document.getElementById('background-color');
    
    if (languageSelect) languageSelect.value = language;
    if (backgroundColorSelect) backgroundColorSelect.value = backgroundColor;
}

function previewSettings() {
    const language = document.getElementById('language').value;
    const backgroundColor = document.getElementById('background-color').value;

    applyTheme(backgroundColor);
    document.documentElement.lang = language;
}

function applyTheme(backgroundColor) {
    const body = document.body;
    const header = document.querySelector('header');
    const nav = document.querySelector('nav');
    const main = document.querySelector('main');

    // Xóa tất cả các lớp bg-* cũ
    [body, header, nav, main].forEach(element => {
        if (element) {
            element.classList.remove('bg-light', 'bg-soft-blue', 'bg-soft-green', 'bg-soft-orange', 'bg-soft-purple', 'bg-light-header');
        }
    });

    // Thêm lớp mới
    if (backgroundColor === 'bg-light') {
        body.classList.add('bg-light');
        if (header) header.classList.add('bg-light-header');
    } else {
        [body, header, nav, main].forEach(element => {
            if (element) {
                element.classList.add(backgroundColor);
            }
        });
    }
}

// Áp dụng cài đặt khi trang được tải
document.addEventListener('DOMContentLoaded', applySettings);

// Thêm event listener cho select màu nền và ngôn ngữ
if (document.getElementById('background-color')) {
    document.getElementById('background-color').addEventListener('change', previewSettings);
}

if (document.getElementById('language')) {
    document.getElementById('language').addEventListener('change', previewSettings);
}

// Trong trang cài đặt, thêm event listener cho form submit
if (document.querySelector('.settings-form')) {
    document.querySelector('.settings-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveSettings();
        alert('Đã lưu thay đổi thành công!');
    });
}
