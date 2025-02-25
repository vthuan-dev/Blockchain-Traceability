const Redis = require('ioredis');
require('dotenv').config();

let redisClient;

try {
  // Sử dụng REDIS_URL từ biến môi trường (Heroku Key-Value Store tạo biến này)
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  
  // Thêm tùy chọn TLS để bỏ qua xác minh chứng chỉ
  const redisOptions = {
    tls: {
      rejectUnauthorized: false // Bỏ qua việc xác minh chứng chỉ SSL
    }
  };

  redisClient = new Redis(redisUrl, redisOptions);

  redisClient.on('connect', () => {
    console.log('Connected to Redis successfully');
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

} catch (error) {
  console.error('Error initializing Redis client:', error);
  // Tạo một client giả nếu không thể kết nối Redis
  redisClient = {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(null),
    del: () => Promise.resolve(null),
  };
  console.log('Using fallback Redis client');
}

module.exports = redisClient;
