import { Request, Response } from 'express';
import db from '../config/database.js';

export const getWidgetData = async (req: Request, res: Response) => {
  try {
    const { businessId, type } = req.params;

    if (!businessId || !type) {
      return res.status(400).json({ error: 'businessId and type are required' });
    }

    if (type === 'best-reviews') {
      const reviews = await db.query(
        'SELECT reviewer_name, comment, rating, review_date FROM reviews WHERE business_id = $1 AND rating = 5 ORDER BY review_date DESC LIMIT 10',
        [businessId]
      );
      return res.json(reviews.rows);
    }

    if (type === 'average-rating') {
      const result = await db.query(
        'SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews FROM reviews WHERE business_id = $1',
        [businessId]
      );
      return res.json(result.rows[0]);
    }

    if (type === 'recent-activity') {
      const reviews = await db.query(
        'SELECT reviewer_name, rating, review_date FROM reviews WHERE business_id = $1 ORDER BY review_date DESC LIMIT 5',
        [businessId]
      );
      const leads = await db.query(
        'SELECT first_name, created_at FROM leads WHERE business_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 5',
        [businessId, 'converted']
      );
      return res.json({ reviews: reviews.rows, leads: leads.rows });
    }

    res.status(400).json({ error: 'Invalid widget type' });
  } catch (error) {
    console.error('Get Widget Data Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getWidgetConfig = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;

    const result = await db.query('SELECT name FROM businesses WHERE id = $1', [businessId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({
      theme: 'light',
      primaryColor: '#3b82f6',
      borderRadius: '8px',
      showPhotos: true,
      businessName: result.rows[0].name
    });
  } catch (error) {
    console.error('Get Widget Config Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getWidgetSnippet = async (req: Request, res: Response) => {
  const { businessId, type } = req.params;
  
  const snippet = `
<div id="localboost-widget-${type}" data-business-id="${businessId}" data-type="${type}"></div>
<script src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/widgets/loader.js" async></script>
  `.trim();

  res.json({ snippet });
};
