window.DashboardManager = {
  async updateDashboardStats() {
    try {
      // Lấy số lượng người dùng
      const userCount = await StatManager.getUserCount();
      const userCountElement = document.querySelector('.bg-blue .stat-number');
      if (userCountElement && !userCountElement.dataset.updated) {
        userCountElement.textContent = `${userCount} người dùng`;
        userCountElement.dataset.updated = 'true';
      }

      // Lấy số lượng sản phẩm
      const productCount = await StatManager.getProductCount();
      const productCountElement = document.querySelector('.bg-orange .stat-number');
      if (productCountElement && !productCountElement.dataset.updated) {
        productCountElement.textContent = `${productCount} sản phẩm`;
        productCountElement.dataset.updated = 'true';
      }

      // Lấy số lượng vùng sản xuất
      const regionCount = await this.getRegionCount();
      const regionCountElement = document.querySelector('.bg-red .stat-number');
      if (regionCountElement && !regionCountElement.dataset.updated) {
        regionCountElement.textContent = `${regionCount} vùng`;
        regionCountElement.dataset.updated = 'true';
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật thống kê:', error);
    }
  },

  async getRegionCount() {
    try {
      // Lấy thông tin admin từ API
      const userInfoResponse = await fetch('/api/user-info');
      const userInfo = await userInfoResponse.json();
      
      if (!userInfo.province_id) {
        console.error('Không tìm thấy mã tỉnh của admin');
        return 0;
      }

      // Lấy danh sách vùng sản xuất theo province_id
      const response = await fetch(`/api/regions?province_id=${userInfo.province_id}`);
      const regions = await response.json();
      return regions.length;
    } catch (error) {
      console.error('Lỗi khi lấy số lượng vùng sản xuất:', error);
      return 0;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  DashboardManager.updateDashboardStats();
});
