const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Hàm gửi email
async function sendEmail(userEmail, userName, link, subject, templatePath) {
    // Đọc nội dung file HTML
    const emailTemplate = fs.readFileSync(templatePath, 'utf8');

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
