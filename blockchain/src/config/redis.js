const Redis = require('ioredis');
require('dotenv').config();

let redisClient;

try {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = new Redis(redisUrl, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redisClient.on('connect', () => {
    console.log('Kết nối Redis thành công');
  });

  redisClient.on('error', (err) => {
    console.error('Lỗi Redis:', err);
  });

} catch (error) {
  console.error('Lỗi khởi tạo Redis client:', error);
  // Tạo client dự phòng nếu không kết nối được Redis
  redisClient = {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(null),
    del: () => Promise.resolve(null)
  };
  console.log('Sử dụng Redis client dự phòng');
}

module.exports = redisClient;
