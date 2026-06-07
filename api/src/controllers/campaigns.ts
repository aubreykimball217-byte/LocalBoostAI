import { Request, Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';
import { sendSMS } from '../services/sms.js';
import crypto from 'crypto';
import { generateQRCodeDataURL } from '../utils/qrcode.js';

export const getBusinessQRCode = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.params;
    
    // In a real app, we might have a permanent QR code link for the business
    const businessReviewUrl = `${process.env.FRONTEND_URL}/review/${businessId}`;
    const qrCodeDataURL = await generateQRCodeDataURL(businessReviewUrl);
    
    res.json({ qrCodeDataURL, url: businessReviewUrl });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
export const sendReviewRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, customerId, method } = req.body; // method: 'email' or 'sms'

    if (!businessId || !customerId || !method) {
      return res.status(400).json({ error: 'businessId, customerId, and method are required' });
    }

    // Get business and customer details
    const businessResult = await db.query('SELECT name, google_place_id FROM businesses WHERE id = $1', [businessId]);
    const customerResult = await db.query('SELECT first_name, email, phone FROM customers WHERE id = $1', [customerId]);

    if (businessResult.rows.length === 0 || customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business or Customer not found' });
    }

    const business = businessResult.rows[0];
    const customer = customerResult.rows[0];
    const token = crypto.randomBytes(16).toString('hex');

    // Save request
    await db.query(
      'INSERT INTO review_requests (business_id, customer_id, token) VALUES ($1, $2, $3)',
      [businessId, customerId, token]
    );

    const feedbackUrl = `${process.env.FRONTEND_URL}/feedback/${token}`;

    if (method === 'email') {
      if (!customer.email) return res.status(400).json({ error: 'Customer email not found' });
      
      const subject = `How was your visit to ${business.name}?`;
      const text = `Hi ${customer.first_name}, thank you for visiting ${business.name}! We'd love to hear your feedback: ${feedbackUrl}`;
      const html = `<p>Hi ${customer.first_name},</p><p>Thank you for visiting <strong>${business.name}</strong>!</p><p>We'd love to hear about your experience. Please leave us your feedback by clicking the link below:</p><p><a href="${feedbackUrl}">${feedbackUrl}</a></p>`;
      
      await sendEmail(customer.email, subject, text, html);
    } else if (method === 'sms') {
      if (!customer.phone) return res.status(400).json({ error: 'Customer phone not found' });
      
      const body = `Hi ${customer.first_name}, thanks for visiting ${business.name}! We'd love your feedback: ${feedbackUrl}`;
      await sendSMS(customer.phone, body);
    }

    res.json({ message: 'Review request sent successfully', token });
  } catch (error) {
    console.error('Send Review Request Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getFeedbackDetails = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const result = await db.query(
      'SELECT rr.*, b.name as business_name, b.google_place_id FROM review_requests rr JOIN businesses b ON rr.business_id = b.id WHERE rr.token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { rating, feedback } = req.body;

    if (!rating) {
      return res.status(400).json({ error: 'Rating is required' });
    }

    const result = await db.query(
      'UPDATE review_requests SET rating = $1, feedback = $2, status = $3, responded_at = CURRENT_TIMESTAMP WHERE token = $4 RETURNING *',
      [rating, feedback, 'responded', token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    const updatedRequest = result.rows[0];

    // If positive rating, return Google Review Link
    if (rating >= 4) {
      const businessResult = await db.query('SELECT google_place_id FROM businesses WHERE id = $1', [updatedRequest.business_id]);
      const googlePlaceId = businessResult.rows[0]?.google_place_id;
      const googleReviewUrl = googlePlaceId 
        ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
        : null;
      
      return res.json({ message: 'Feedback submitted', rating, googleReviewUrl });
    }

    res.json({ message: 'Feedback submitted privately', rating });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
