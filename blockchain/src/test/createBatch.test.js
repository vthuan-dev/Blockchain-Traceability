// file này dùng để test API POST /createbatch luu vao blockchain
import chai from 'chai';
import chaiHttp from 'chai-http';
import { describe, it } from 'mocha';
import app from '../../server.js'; // Đảm bảo đường dẫn đúng đến file server.js của bạn
import fs from 'fs';
import path from 'path';

chai.use(chaiHttp);
const { expect } = chai;

describe('POST /createbatch', () => {
  it('should add a new batch', (done) => {
    chai.request(app)
      .post('/createbatch')
      .set('Content-Type', 'multipart/form-data')
      .field('batchName', 'Batch 1')
      .field('productId', 'Product 1')
      .field('producerId', 'Producer 1')
      .field('quantity', 100)
      .field('productionDate', '2023-01-01')
      .field('expireDate', '2024-01-01')
      .attach('images', fs.readFileSync(path.join(__dirname, 'testImage1.jpg')), 'testImage1.jpg')
      .attach('images', fs.readFileSync(path.join(__dirname, 'testImage2.jpg')), 'testImage2.jpg')
      .attach('certificate', fs.readFileSync(path.join(__dirname, 'testCertificate.pdf')), 'testCertificate.pdf')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.equal('Thêm lô hàng thành công');
        done();
      });
  });
});