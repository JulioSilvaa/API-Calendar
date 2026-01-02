import nodemailer from 'nodemailer';



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
export async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER, // Gmail requires 'from' to be the authenticated user
      to,
      subject,
      html,
    });
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email via Nodemailer:', error);
    throw error;
  }
}
