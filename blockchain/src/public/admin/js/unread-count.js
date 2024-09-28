function updateUnreadCount(count) {
    const replyCount = document.querySelector('.reply-count');
    if (replyCount) {
        replyCount.textContent = count;
        replyCount.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

document.addEventListener('socketInitialized', () => {
    if (window.socket) {
        window.socket.on("updateUnreadCount", (count) => {
            console.log("Received updateUnreadCount:", count); // Log để kiểm tra
            updateUnreadCount(count);
        });
    } else {
        console.error('Socket chưa được khởi tạo');
    }
});
