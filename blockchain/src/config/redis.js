const Redis = require('ioredis');
require('dotenv').config();

let redisClient;

try {
  // Sử dụng REDIS_URL từ biến môi trường (Heroku tạo biến này)
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL không được cấu hình');
  }
  
  console.log('Đang kết nối đến Redis tại:', redisUrl.replace(/:[^:]*@/, ':***@')); // Ẩn mật khẩu trong log
  
  // Cấu hình Redis với các tùy chọn phù hợp cho Heroku
  const redisOptions = {
    tls: redisUrl.includes('rediss://') ? {
      rejectUnauthorized: false // Bỏ qua việc xác minh chứng chỉ SSL
    } : undefined,
    retryStrategy: function(times) {
      const delay = Math.min(times * 100, 3000);
      console.log(`Đang thử kết nối lại Redis sau ${delay}ms...`);
      return delay;
    },
    maxRetriesPerRequest: 5
  };

  redisClient = new Redis(redisUrl, redisOptions);

  redisClient.on('connect', () => {
    console.log('Đã kết nối thành công đến Redis');
  });

  redisClient.on('error', (err) => {
    console.error('Lỗi kết nối Redis:', err);
  });

} catch (error) {
  console.error('Lỗi khởi tạo Redis client:', error);
  // Tạo một client giả nếu không thể kết nối Redis
  redisClient = {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(null),
    del: () => Promise.resolve(null),
    // Thêm các phương thức cần thiết khác
    on: () => {},
    quit: () => Promise.resolve(),
  };
  console.log('Sử dụng Redis client dự phòng');
}

module.exports = redisClient;
