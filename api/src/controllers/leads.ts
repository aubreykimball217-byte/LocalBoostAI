import { Request, Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';
import { sendSMS } from '../services/sms.js';

export const createLead = async (req: Request, res: Response) => {
  try {
    const { businessId, source, firstName, lastName, email, phone, message } = req.body;

    if (!businessId || !email) {
      return res.status(400).json({ error: 'businessId and email are required' });
    }

    const result = await db.query(
      `INSERT INTO leads (business_id, source, first_name, last_name, email, phone, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [businessId, source || 'web', firstName, lastName, email, phone, message, 'new']
    );

    const newLead = result.rows[0];

    // Automated follow-up
    const businessResult = await db.query('SELECT name FROM businesses WHERE id = $1', [businessId]);
    const businessName = businessResult.rows[0]?.name || 'our business';

    if (email) {
      const subject = `Thanks for contacting ${businessName}`;
      const text = `Hi ${firstName || 'there'},\n\nThanks for reaching out to ${businessName}. We've received your message and will get back to you shortly.\n\nBest regards,\nThe ${businessName} Team`;
      await sendEmail(email, subject, text, `<p>${text.replace(/\n/g, '<br>')}</p>`);
    }

    if (phone) {
      const body = `Hi ${firstName || 'there'}, thanks for contacting ${businessName}! We'll get back to you soon.`;
      await sendSMS(phone, body);
    }

    res.status(201).json(newLead);
  } catch (error) {
    console.error('Create Lead Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, status } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    let query = 'SELECT * FROM leads WHERE business_id = $1 AND deleted_at IS NULL';
    const params: any[] = [businessId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get Leads Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getLeadStats = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
        COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as leads_last_30_days
       FROM leads WHERE business_id = $1 AND deleted_at IS NULL`,
      [businessId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get Lead Stats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, firstName, lastName, email, phone, message } = req.body;

    const result = await db.query(
      `UPDATE leads SET 
        status = COALESCE($1, status),
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        message = COALESCE($6, message),
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 RETURNING *`,
      [status, firstName, lastName, email, phone, message, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update Lead Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getChatWidgetSnippet = async (req: Request, res: Response) => {
  const { businessId } = req.params;
  
  if (!businessId) {
    return res.status(400).json({ error: 'businessId is required' });
  }

  const snippet = `
<!-- LocalBoost AI Chat Widget -->
<script>
  window.LOCALBOOST_CONFIG = {
    businessId: "${businessId}",
    apiUrl: "${process.env.API_URL || 'http://localhost:3001'}"
  };
</script>
<script src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/widgets/chat.js" async></script>
<!-- End LocalBoost AI Chat Widget -->
  `.trim();

  res.json({ snippet });
};

export const getWidgetConfig = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const businessResult = await db.query('SELECT name, industry FROM businesses WHERE id = $1', [businessId]);
    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = businessResult.rows[0];

    // Mock widget config
    res.json({
      businessId,
      businessName: business.name,
      primaryColor: '#3b82f6',
      welcomeMessage: `Hi! How can we help you today with your ${business.industry || 'needs'}?`,
      position: 'right',
      enabled: true
    });
  } catch (error) {
    console.error('Get Widget Config Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
