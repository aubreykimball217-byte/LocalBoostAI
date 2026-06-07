import { Request, Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { syncReviews } from '../services/google-reviews.js';
import { generateAIResponse } from '../services/ai-manager.js';

export const getReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, platform, rating, status } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    let query = 'SELECT * FROM reviews WHERE business_id = $1';
    const params: any[] = [businessId];

    if (platform) {
      params.push(platform);
      query += ` AND platform = $${params.length}`;
    }

    if (rating) {
      params.push(rating);
      query += ` AND rating = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND response_status = $${params.length}`;
    }

    query += ' ORDER BY review_date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getReviewById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM reviews WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const respondToReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { responseText } = req.body;

    if (!responseText) {
      return res.status(400).json({ error: 'responseText is required' });
    }

    const result = await db.query(
      'UPDATE reviews SET ai_response = $1, response_status = $2, responded_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [responseText, 'published', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const generateResponse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const reviewResult = await db.query(
      'SELECT r.*, b.name as business_name FROM reviews r JOIN businesses b ON r.business_id = b.id WHERE r.id = $1',
      [id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = reviewResult.rows[0];
    const aiResponse = await generateAIResponse(review.comment || '', review.rating, review.business_name);

    await db.query(
      'UPDATE reviews SET ai_response = $1, response_status = $2 WHERE id = $3',
      [aiResponse, 'drafted', id]
    );

    res.json({ aiResponse });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const syncBusinessReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    await syncReviews(businessId);
    res.json({ message: 'Reviews synced successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getReviewStats = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN rating < 4 THEN 1 END) as negative_reviews,
        COUNT(CASE WHEN response_status = 'published' THEN 1 END) as responded_count
       FROM reviews WHERE business_id = $1`,
      [businessId]
    );

    res.json(statsResult.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
