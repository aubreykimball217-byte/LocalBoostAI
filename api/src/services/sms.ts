import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

export const sendSMS = async (to: string, body: string) => {
  if (!client) {
    console.log(`[MOCK SMS] To: ${to}, Body: ${body}`);
    return;
  }

  try {
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};
