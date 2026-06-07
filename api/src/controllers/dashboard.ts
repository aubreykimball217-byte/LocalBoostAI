import { Request, Response, NextFunction } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const getDashboardMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // 1. Review Metrics
    const reviewStats = await db.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN rating < 4 THEN 1 END) as negative_reviews
       FROM reviews WHERE business_id = $1`,
      [businessId]
    );

    // 2. Lead Metrics
    const leadStats = await db.query(
      `SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads
       FROM leads WHERE business_id = $1 AND deleted_at IS NULL`,
      [businessId]
    );

    // 3. Customer Metrics
    const customerStats = await db.query(
      'SELECT COUNT(*) as total_customers FROM customers WHERE business_id = $1 AND deleted_at IS NULL',
      [businessId]
    );

    // 4. Social Post Metrics
    const socialStats = await db.query(
      'SELECT COUNT(*) as total_posts FROM social_posts WHERE business_id = $1 AND status = "published"',
      [businessId]
    );

    res.json({
      reviews: {
        total: parseInt(reviewStats.rows[0].total_reviews),
        averageRating: parseFloat(reviewStats.rows[0].average_rating) || 0,
        positive: parseInt(reviewStats.rows[0].positive_reviews),
        negative: parseInt(reviewStats.rows[0].negative_reviews)
      },
      leads: {
        total: parseInt(leadStats.rows[0].total_leads),
        converted: parseInt(leadStats.rows[0].converted_leads),
        conversionRate: leadStats.rows[0].total_leads > 0 
          ? (leadStats.rows[0].converted_leads / leadStats.rows[0].total_leads) * 100 
          : 0
      },
      customers: {
        total: parseInt(customerStats.rows[0].total_customers)
      },
      social: {
        publishedPosts: parseInt(socialStats.rows[0].total_posts)
      }
    });
  } catch (error) {
    console.error('Get Dashboard Metrics Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getCompetitiveBenchmarking = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const businessResult = await db.query('SELECT industry FROM businesses WHERE id = $1', [businessId]);
    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const industry = businessResult.rows[0].industry;

    // Mock benchmark data based on industry
    const benchmarks: Record<string, any> = {
      'dentist': { industryAvg: 4.2, topPercentile: 4.8 },
      'salon': { industryAvg: 4.5, topPercentile: 4.9 },
      'hvac': { industryAvg: 4.0, topPercentile: 4.7 },
      'plumbing': { industryAvg: 3.8, topPercentile: 4.6 },
      'default': { industryAvg: 4.1, topPercentile: 4.7 }
    };

    const benchmark = benchmarks[industry?.toLowerCase()] || benchmarks['default'];

    const myRatingResult = await db.query(
      'SELECT AVG(rating) as average_rating FROM reviews WHERE business_id = $1',
      [businessId]
    );

    const myRating = parseFloat(myRatingResult.rows[0].average_rating) || 0;

    res.json({
      myRating,
      industryAvg: benchmark.industryAvg,
      topPercentile: benchmark.topPercentile,
      comparison: myRating >= benchmark.industryAvg ? 'above_average' : 'below_average'
    });
  } catch (error) {
    console.error('Get Benchmarking Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getSocialProofData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Get recent 5-star reviews
    const recentReviews = await db.query(
      'SELECT reviewer_name, comment, rating, review_date FROM reviews WHERE business_id = $1 AND rating = 5 ORDER BY review_date DESC LIMIT 5',
      [businessId]
    );

    // Get recent conversions (mocked or from leads)
    const recentLeads = await db.query(
      'SELECT first_name, created_at FROM leads WHERE business_id = $1 AND status = "converted" ORDER BY created_at DESC LIMIT 5',
      [businessId]
    );

    res.json({
      reviews: recentReviews.rows,
      leads: recentLeads.rows
    });
  } catch (error) {
    console.error('Get Social Proof Data Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
