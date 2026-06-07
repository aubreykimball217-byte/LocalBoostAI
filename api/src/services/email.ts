import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export const sendEmail = async (to: string, subject: string, text: string, html: string) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Text: ${text}`);
    return;
  }

  const msg = {
    to,
    from: process.env.EMAIL_FROM || 'noreply@localboost.ai',
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
