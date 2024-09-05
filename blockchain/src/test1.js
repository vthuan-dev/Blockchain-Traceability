const express = require('express');
const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const app = express();
const cors = require('cors');
app.use(cors());


const upload = multer({ storage: multer.memoryStorage() }).fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]);

const s3Client = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: "us-east-1",
  credentials: {
    accessKeyId: "A7CD72C8CA9FFDC0EA93",
    secretAccessKey: "XP7FfP9kApmXqKSAFwHraldseTxKtVQG1Lqn8KNH",
  },
});

const BUCKET_NAME = 'truyxuat2';

async function uploadFile(fileBuffer, fileName) {
  try {
    console.log(`Bắt đầu tải lên Filebase: ${fileName}`);

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    console.log(`Tải lên thành công: ${fileName}`);
    
    return await checkFileStatusWithRetry(fileName);
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
      
      const cid = result.Metadata.cid;
      console.log(`CID từ Filebase: ${cid}`);
      
      const ipfsUrl = `https://ipfs.filebase.io/ipfs/${cid}`;
      console.log(`IPFS URL: ${ipfsUrl}`);
      
      return { cid, ipfsUrl };
    } catch (error) {
      if (error.name !== 'NotFound') {
        console.error('Lỗi khi kiểm tra trạng thái:', error);
        throw error;
      }
      if (i < maxRetries - 1) {
        console.log(`File chưa sẵn sàng, thử lại sau ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.log(`Trạng thái file: Không tồn tại sau ${maxRetries} lần thử`);
        throw new Error('File không tồn tại sau nhiều lần thử');
      }
    }
  }
}

// Serve trang HTML

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload.html'));
});


app.post('/upload', upload, async (req, res) => {
  console.log('Received files:', req.files);

  try {
    if (!req.files || !req.files.image1 || !req.files.image2) {
      return res.status(400).send('Cần tải lên cả hai ảnh');
    }

    const results = [];

    for (const fieldName of ['image1', 'image2']) {
      const file = req.files[fieldName][0];
      console.log(`Bắt đầu xử lý file:`, file.originalname);
      try {
        const result = await uploadFile(file.buffer, file.originalname);
        console.log(`Xử lý file thành công:`, result.ipfsUrl);
        results.push({
          filename: file.originalname,
          url: result.ipfsUrl
        });
      } catch (error) {
        console.error(`Lỗi khi xử lý file ${file.originalname}:`, error);
      }
    }

    console.log('Kết quả cuối cùng:', JSON.stringify(results, null, 2));
    res.json(results);
  } catch (error) {
    console.error('Lỗi khi tải lên file:', error);
    res.status(500).send('Lỗi khi tải lên file');
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

});