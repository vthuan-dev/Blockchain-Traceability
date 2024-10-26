# Sử dụng image Node.js làm base
FROM node:18-alpine

# Tạo thư mục làm việc trong container
WORKDIR /app

# Cài đặt các dependencies cần thiết để build bcrypt
RUN apk add --no-cache make gcc g++ python3 linux-headers

# Copy package.json và package-lock.json (nếu có)
COPY package*.json ./

# Cài đặt dependencies và rebuild bcrypt
RUN npm install


# Copy toàn bộ source code vào container
COPY . .

# Copy .env file
COPY .env .

# Build ứng dụng (nếu cần)
RUN npm run build

# Mở port 3000 (hoặc port mà ứng dụng của bạn sử dụng)
EXPOSE 3000

# Chạy ứng dụng
CMD ["npm", "start"]
