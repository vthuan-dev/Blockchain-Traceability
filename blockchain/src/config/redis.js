const Redis = require('ioredis');
require('dotenv').config();

let redisClient;

try {
  // Sử dụng REDIS_URL từ biến môi trường (Heroku Key-Value Store tạo biến này)
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  
  redisClient = new Redis(redisUrl);
  
  redisClient.on('connect', () => {
    console.log('Connected to Redis successfully');
  });
  
  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
    // Không throw error ở đây, chỉ log lỗi
  });
  
} catch (error) {
  console.error('Error initializing Redis client:', error);
  // Tạo một client giả nếu không thể kết nối Redis
  redisClient = {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(null),
    del: () => Promise.resolve(null),
    // Thêm các phương thức giả khác nếu cần
  };
  console.log('Using fallback Redis client');
}

module.exports = redisClient; 