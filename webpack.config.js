const path = require("path");

module.exports = {
  entry: "./blockchain/src/public/chatbox/chat.bundle.js", // Điểm vào ứng dụng React từ thư mục src
  output: {
    path: path.resolve(__dirname, "./blockchain/src/public/chatbox"), // Nơi chứa file sau khi bundling
    filename: "chat.bundle.js", // Tên file sau khi bundling
    library: "ChatBox", // Export ChatBox như một thư viện
    libraryTarget: "var", // Export dưới dạng biến toàn cục
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Áp dụng babel-loader cho các file .js
        exclude: /node_modules/, // Bỏ qua node_modules
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"], // Cấu hình Babel để xử lý ES6 và React
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"], // Giúp webpack hiểu file .js và .jsx
  },
  mode: "development", // Chế độ development
  devServer: {
    static: {
      directory: path.join(__dirname, "./blockchain/src/public"),
    },
    compress: true,
    port: 9000, // Chạy trên cổng 9000
  },
};
