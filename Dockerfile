# Sử dụng image Node.js làm base
FROM node:16

# Tạo thư mục làm việc trong container
WORKDIR /app

# Copy package.json và package-lock.json (nếu có)
COPY package*.json ./

# Cài đặt các dependencies
RUN npm install

# Copy toàn bộ source code vào container
COPY . .

# Build ứng dụng (nếu cần)
RUN npm run build

# Mở port 3000 (hoặc port mà ứng dụng của bạn sử dụng)
EXPOSE 3000

# Chạy ứng dụng
CMD ["npm", "start"]