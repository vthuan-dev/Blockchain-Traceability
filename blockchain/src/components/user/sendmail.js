const fs = require('node:fs');
const path = require('node:path');
const nodemailer = require('nodemailer');

async function sendEmail(userEmail, userName, data, subject, templatePath) {
    console.log('Bắt đầu gửi email cho:', userEmail);

    // Tạo transporter với cấu hình bảo mật hơn
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: 'truyxuat.blockchain@gmail.com',
            pass: 'ylml gpnp lgmz wpwz'
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Đọc template
        const emailTemplate = fs.readFileSync(templatePath, 'utf8');
        
        // Khởi tạo nội dung email với userName
        let emailContent = emailTemplate.replace(/\{\{user_name\}\}/g, userName || '');
        
        // Nếu data là object, thay thế tất cả các placeholder tương ứng
        if (data && typeof data === 'object') {
            for (const key of Object.keys(data)) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                emailContent = emailContent.replace(regex, data[key] || '');
            }
        } 
        // Nếu data là string (trường hợp link), xử lý như cũ
        else if (typeof data === 'string') {
            emailContent = emailContent.replace(/\{\{link\}\}/g, data || '');
        }

        // Cấu hình email
        const mailOptions = {
            from: '"Truy xuất nguồn gốc" <truyxuat.blockchain@gmail.com>',
            to: userEmail,
            subject: subject,
            html: emailContent
        };

        // Gửi email và đợi kết quả
        const info = await transporter.sendMail(mailOptions);
        console.log('Email đã gửi thành công:', info.messageId);
        return true;

    } catch (error) {
        console.error('Lỗi khi gửi email:', error);
        throw error;
    }
}

module.exports = { sendEmail };
