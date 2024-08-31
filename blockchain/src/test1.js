const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const dotenv = require('dotenv');
dotenv.config();

// Cấu hình Filebase
const s3Client = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: "us-east-1", // Add this line
  credentials: {
    accessKeyId: "A7CD72C8CA9FFDC0EA93",
    secretAccessKey: "XP7FfP9kApmXqKSAFwHraldseTxKtVQG1Lqn8KNH",
  },
});

const BUCKET_NAME = 'truyxuat2';
const FILE_PATH = './src/img1.jpg';

async function uploadFile() {
  try {
    const fileName = path.basename(FILE_PATH);
    const fileContent = fs.readFileSync(FILE_PATH);

    console.log(`Bắt đầu tải lên Filebase: ${fileName}`);

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileContent
    };

    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);
    console.log(`Tải lên thành công: ${fileName}`);
    
    return { fileName };
  } catch (error) {
    console.error('Lỗi khi tải lên Filebase:', error);
    throw error;
  }
}

async function checkFileStatusWithRetry(fileName, maxRetries = 5, retryDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: fileName
      };

      const command = new HeadObjectCommand(params);
      const result = await s3Client.send(command);
      console.log('Thông tin file:', result);
      console.log(`Trạng thái file: Tồn tại`);
      
      // Lấy CID từ metadata
      const cid = result.Metadata.cid;
      console.log(`CID từ Filebase: ${cid}`);
      
      // Tạo IPFS URL sử dụng gateway của Filebase
      const ipfsUrl = `https://ipfs.filebase.io/ipfs/${cid}`;
      console.log(`IPFS URL: ${ipfsUrl}`);
      
      return { cid, ipfsUrl };
    } catch (error) {
      if (error.name !== 'NotFound') {
        console.error('Lỗi khi kiểm tra trạng thái:', error);
        return;
      }
      if (i < maxRetries - 1) {
        console.log(`File chưa sẵn sàng, thử lại sau ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.log(`Trạng thái file: Không tồn tại sau ${maxRetries} lần thử`);
      }
    }
  }
}

// Hàm kiểm tra xác thực
async function testAuthentication() {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: 'test-auth' });
    await s3Client.send(command);
    console.log('Xác thực thành công');
  } catch (error) {
    if (error.name === 'NotFound') {
      console.log('Xác thực thành công (bucket tồn tại nhưng object không tồn tại)');
    } else {
      console.error('Lỗi xác thực:', error);
      throw error;
    }
  }
}

// Thêm hàm delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Sửa đổi phần gọi hàm chính
testAuthentication()
  .then(() => uploadFile())
  .then(({ fileName }) => checkFileStatusWithRetry(fileName))
  .then(({ cid, ipfsUrl }) => {
    console.log(`CID cuối cùng: ${cid}`);
    console.log(`URL IPFS cuối cùng: ${ipfsUrl}`);
  })
  .catch(error => {
    console.error('Lỗi không xử lý được:', error);
  });