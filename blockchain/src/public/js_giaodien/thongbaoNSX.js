// Hàm tải thông báo
async function loadNotifications() {
    try {
        const response = await fetch('/api/producer-notifications');
        if (response.ok) {
            const notifications = await response.json();
            updateNotificationUI(notifications);
        }
    } catch (error) {
        console.error('Lỗi khi tải thông báo:', error);
    }
}

// Hàm cập nhật giao diện thông báo
function updateNotificationUI(notifications) {
    const notificationList = document.getElementById('notificationList');
    const notificationCount = document.getElementById('notification-count');
    const markAllReadBtn = document.getElementById('markAllRead');
    
    // Cập nhật số lượng thông báo
    notificationCount.textContent = notifications.length;
    markAllReadBtn.disabled = notifications.length === 0;

    // Hiển thị message khi không có thông báo
    if (notifications.length === 0) {
        notificationList.innerHTML = `
            <div class="text-center text-muted p-3">
                <i class="fas fa-bell-slash mb-2" style="font-size: 24px;"></i>
                <p class="mb-0">Không có thông báo mới</p>
            </div>
        `;
        return;
    }

    // Hiển thị danh sách thông báo
    notificationList.innerHTML = '';
    notifications.forEach(notification => {
        const notificationItem = createNotificationItem(notification);
        notificationList.appendChild(notificationItem);
    });

    // Thêm sự kiện cho nút đánh dấu tất cả đã đọc
    setupMarkAllReadButton(markAllReadBtn);
}

// Hàm tạo item thông báo
function createNotificationItem(notification) {
    const notificationItem = document.createElement('div');
    notificationItem.className = 'notification-item';
    
    // Xác định trạng thái và icon tương ứng
    let statusIcon, statusText, statusClass;
    if (notification.status === 1) {
        statusIcon = 'fa-check-circle';
        statusClass = 'text-success';
        statusText = 'đã phê duyệt';
    } else if (notification.status === 2) {
        statusIcon = 'fa-times-circle';
        statusClass = 'text-danger';
        statusText = 'đã từ chối';
    }
    
    notificationItem.innerHTML = `
        <div class="notification-content d-flex align-items-center p-3">
            <div>
                <div class="font-weight-bold mb-1">${notification.inspector_name}</div>
                <div class="notification-text mb-1">
                    <i class="fas ${statusIcon} ${statusClass}"></i>
                    ${statusText} lô hàng: ${notification.batch_name}
                </div>
                <div class="notification-time text-muted">
                    ${new Date(notification.approved_on).toLocaleString()}
                </div>
            </div>
            <div class="isread-button" data-notification-id="${notification.notification_id}">
                <i class="fas fa-check"></i>
            </div>
        </div>
    `;

    // Thêm sự kiện click cho nút đánh dấu đã đọc
    const isreadButton = notificationItem.querySelector('.isread-button');
    setupIsreadButton(isreadButton);

    return notificationItem;
}

// Hàm thiết lập sự kiện cho nút đánh dấu đã đọc
function setupIsreadButton(isreadButton) {
    isreadButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            const notificationId = isreadButton.dataset.notificationId;
            await markNotificationAsRead(notificationId);
            
            isreadButton.classList.add('marked');
            
            const notificationCount = document.getElementById('notification-count');
            const newCount = parseInt(notificationCount.textContent) - 1;
            notificationCount.textContent = newCount;
            
        } catch (error) {
            console.error('Lỗi khi đánh dấu đã đọc:', error);
            showToast('Có lỗi xảy ra khi đánh dấu đã đọc', 'error');
        }
    });
}

// Hàm thiết lập sự kiện cho nút đánh dấu tất cả đã đọc
function setupMarkAllReadButton(markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async () => {
        try {
            const originalContent = markAllReadBtn.innerHTML;
            markAllReadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            markAllReadBtn.disabled = true;

            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Cập nhật UI
            document.getElementById('notification-count').textContent = '0';
            document.getElementById('notificationList').innerHTML = `
                <div class="text-center text-muted p-3">
                    <i class="fas fa-bell-slash mb-2" style="font-size: 24px;"></i>
                    <p class="mb-0">Không có thông báo mới</p>
                </div>
            `;
            markAllReadBtn.innerHTML = `
                <i class="fas fa-check-double mr-1"></i>
                Đánh dấu tất cả đã đọc
            `;
            markAllReadBtn.disabled = true;

        } catch (error) {
            console.error('Lỗi khi đánh dấu tất cả đã đọc:', error);
            markAllReadBtn.innerHTML = `
                <i class="fas fa-check-double mr-1"></i>
                Đánh dấu tất cả đã đọc
            `;
            markAllReadBtn.disabled = false;
        }
    });
}

// Hàm đánh dấu thông báo đã đọc
async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            loadNotifications();
        } else {
            const error = await response.json();
            console.error('Lỗi:', error.error);
        }
    } catch (error) {
        console.error('Lỗi khi đánh dấu thông báo đã đọc:', error);
    }
}

// Khởi tạo khi trang được load
document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();
    // Refresh thông báo mỗi 5 phút
    setInterval(loadNotifications, 300000);
});

// Export các hàm cần thiết
export {
    loadNotifications,
    updateNotificationUI,
    markNotificationAsRead
};