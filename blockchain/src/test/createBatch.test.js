import chai from 'chai';
import chaiHttp from 'chai-http';
import { describe, it } from 'mocha';
import app from '../server.js'; // Ensure the path to your server.js file is correct
import fs from 'fs';
import path from 'path';

chai.use(chaiHttp);
const { expect } = chai;

describe('POST /createbatch', () => {
  it('should add a new batch', (done) => {
    chai.request(app)
      .post('/createbatch')
      .set('Content-Type', 'multipart/form-data')
      .field('batchName', 'Lô hàng thứ 100')
      .field('productId', '1')
      .field('producerId', '9')
      .field('quantity', 100)
      .field('productionDate', '2023-01-01')
      .field('expireDate', '2024-01-01')
      .attach('images', fs.readFileSync(path.join(__dirname, 'img1.jpg')), 'img1.jpg')
      .attach('images', fs.readFileSync(path.join(__dirname, 'img2.jpg')), 'img2.jpg')
      .attach('certificate', fs.readFileSync(path.join(__dirname, 'img3.pdf')), 'img3.pdf')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.equal('Thêm lô hàng thành công');
        done();
      });
  });
});

