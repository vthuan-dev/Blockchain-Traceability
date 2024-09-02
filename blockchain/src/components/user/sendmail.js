const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Đọc nội dung file HTML
const emailTemplatePath = path.join(__dirname, '../../public/xacthuc.html');
const emailTemplate = fs.readFileSync(emailTemplatePath, 'utf8');

// Hàm gửi email
async function sendVerificationEmail(userEmail, userId, verificationLink) {
    // Tạo transporter
    let transporter = nodemailer.createTransport({
        service: 'gmail', // Hoặc dịch vụ email khác
        auth: {
            user: 'locb2111807@student.ctu.edu.vn', // Thay bằng email của bạn
            pass: 'wsib uqog gcbz bprl'   // Thay bằng mật khẩu email của bạn
        }
    });

    // Thay thế các placeholder trong template
    const emailContent = emailTemplate
        .replace('{{user_id}}', userId)
        .replace('{{verification_link}}', verificationLink);

    // Cấu hình email
    let mailOptions = {
        from: 'locb2111807@student.ctu.edu.vn',
        to: userEmail,
        subject: 'Xác thực tài khoản của bạn',
        html: emailContent
    };

    // Gửi email
    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = { sendVerificationEmail };