const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g. "smtp.gmail.com" or "smtp.mailtrap.io"
  port: process.env.SMTP_PORT, // usually 465 for SSL or 587 for TLS
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // SMTP username
    pass: process.env.SMTP_PASS, // SMTP password
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.error(':x: SMTP connection failed:', error);
  } else {
    console.log(':white_check_mark: SMTP server is ready to send emails');
  }
});
module.exports = transporter;