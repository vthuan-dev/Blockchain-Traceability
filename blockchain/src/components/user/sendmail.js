const fs = require('node:fs');
const path = require('node:path');
const nodemailer = require('nodemailer');

async function sendEmail(userEmail, userName, link, subject, templatePath) {
    console.log('Bắt đầu gửi email cho:', userEmail);

    // Tạo transporter với cấu hình bảo mật hơn
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'truyxuat.blockchain@gmail.com',
            pass: 'ylml gpnp lgmz wpwz' // Nên dùng biến môi trường
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Đọc template
        const emailTemplate = fs.readFileSync(templatePath, 'utf8');
        
        // Thay thế placeholder
        const emailContent = emailTemplate
            .replace(/\{\{user_name\}\}/g, userName || '') // Thêm regex global flag
            .replace(/\{\{link\}\}/g, link || '');        // Thêm regex global flag

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
