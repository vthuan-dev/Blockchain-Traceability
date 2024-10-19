const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Hàm gửi email
async function sendEmail(userEmail, userName, link, subject, templatePath) {
    console.log('Bắt đầu gửi email');
    console.log('Email người nhận:', userEmail);
    console.log('Tên người nhận:', userName);
    console.log('Link xác thực:', link);
    console.log('Đường dẫn template:', templatePath);

    // Đọc nội dung file HTML
    let emailTemplate;
    try {
        emailTemplate = fs.readFileSync(templatePath, 'utf8');
        console.log('Đã đọc file template thành công');
    } catch (error) {
        console.error('Lỗi khi đọc file template:', error);
        throw error;
    }

    // Tạo transporter dùng 
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'truyxuat.blockchain@gmail.com',
            pass: 'ylml gpnp lgmz wpwz'
        }
    });

    // Thay thế các placeholder trong template
    const emailContent = emailTemplate
        .replace('{{user_name}}', userName)
        .replace('{{link}}', link);

    // Cấu hình email
    let mailOptions = {
        from: 'truyxuat.blockchain@gmail.com',
        to: userEmail,
        subject: subject,
        html: emailContent
    };

    // Gửi email
    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

module.exports = { sendEmail };
