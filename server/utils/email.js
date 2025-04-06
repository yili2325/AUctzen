const nodemailer = require('nodemailer');

const sendAdminNotification = async (user) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  // Send email
  await transporter.sendMail({
    from: '"AusCitizen App" <noreply@auscitizen.com>',
    to: 'admin@auscitizen.com',
    subject: 'New User Signup',
    html: `
      <h1>New User Registration</h1>
      <p>A new user has signed up for AusCitizen Test:</p>
      <ul>
        <li><strong>Name:</strong> ${user.name}</li>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Plan:</strong> ${user.subscription.plan}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    `
  });
};

module.exports = { sendAdminNotification }; 