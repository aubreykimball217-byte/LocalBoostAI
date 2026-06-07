import { Request, Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

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

    // TODO: Trigger automated follow-up sequence here

    res.status(201).json(newLead);
  } catch (error) {
    console.error('Create Lead Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Ensure user has access to this business (optional, depends on auth implementation)
    
    const result = await db.query(
      'SELECT * FROM leads WHERE business_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
      [businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get Leads Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateLeadStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await db.query(
      'UPDATE leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update Lead Status Error:', error);
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
