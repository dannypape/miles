const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables

async function testSMTP() {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // `true` for port 465, `false` for 587
        auth: {
            user: process.env.SMTP_USER, // Email address
            pass: process.env.SMTP_PASS  // App password
        }
    });

    try {
        const info = await transporter.verify();
        console.log('✅ SMTP Connection Successful:', info);
    } catch (error) {
        console.error('❌ SMTP Connection Failed:', error);
    }
}

testSMTP();
