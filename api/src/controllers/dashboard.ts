import { Request, Response, NextFunction } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
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
        COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) as responded_reviews
       FROM reviews WHERE business_id = $1`,
      [businessId]
    );

    // 2. Lead Metrics (this month)
    const leadStats = await db.query(
      `SELECT COUNT(*) as new_leads 
       FROM leads 
       WHERE business_id = $1 
       AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
       AND deleted_at IS NULL`,
      [businessId]
    );

    // 3. Customer Metrics
    const customerStats = await db.query(
      'SELECT COUNT(*) as total_customers FROM customers WHERE business_id = $1 AND deleted_at IS NULL',
      [businessId]
    );

    // 4. Social Post Metrics (scheduled)
    const socialStats = await db.query(
      'SELECT COUNT(*) as scheduled_posts FROM social_posts WHERE business_id = $1 AND status = $2',
      [businessId, 'scheduled']
    );

    // 5. Active Campaigns
    const campaignStats = await db.query(
      'SELECT COUNT(*) as active_campaigns FROM campaigns WHERE business_id = $1 AND status = $2',
      [businessId, 'active']
    );

    // 6. Subscription
    const subStats = await db.query(
      'SELECT plan_level FROM subscriptions WHERE business_id = $1',
      [businessId]
    );

    const reviews = reviewStats.rows[0];
    const responseRate = reviews.total_reviews > 0 
      ? (reviews.responded_reviews / reviews.total_reviews) * 100 
      : 0;

    res.json({
      totalReviews: parseInt(reviews.total_reviews),
      averageRating: parseFloat(reviews.average_rating) || 0,
      responseRate,
      newLeadsThisMonth: parseInt(leadStats.rows[0].new_leads),
      totalCustomers: parseInt(customerStats.rows[0].total_customers),
      scheduledSocialPosts: parseInt(socialStats.rows[0].scheduled_posts),
      activeCampaigns: parseInt(campaignStats.rows[0].active_campaigns),
      subscriptionTier: subStats.rows[0]?.plan_level || 'none'
    });
  } catch (error) {
    console.error('Get Dashboard Summary Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getRatingTrend = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, days = 30 } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const result = await db.query(
      `SELECT 
        date_trunc('day', review_date) as date,
        AVG(rating) as average_rating
       FROM reviews 
       WHERE business_id = $1 
       AND review_date >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
       GROUP BY date
       ORDER BY date ASC`,
      [businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get Rating Trend Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getLeadTrend = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, days = 30 } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const result = await db.query(
      `SELECT 
        date_trunc('day', created_at) as date,
        COUNT(*) as lead_count
       FROM leads 
       WHERE business_id = $1 
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
       AND deleted_at IS NULL
       GROUP BY date
       ORDER BY date ASC`,
      [businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get Lead Trend Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getReviewDistribution = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const result = await db.query(
      `SELECT 
        rating,
        COUNT(*) as count
       FROM reviews 
       WHERE business_id = $1 
       GROUP BY rating
       ORDER BY rating DESC`,
      [businessId]
    );

    const distribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };

    result.rows.forEach(row => {
      distribution[row.rating as keyof typeof distribution] = parseInt(row.count);
    });

    res.json(distribution);
  } catch (error) {
    console.error('Get Review Distribution Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getCompetitiveBenchmarking = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.params;

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
      'dentist': { industryAvg: 4.2, topPercentile: 4.8, ranking: 15, totalCompetitors: 85 },
      'salon': { industryAvg: 4.5, topPercentile: 4.9, ranking: 8, totalCompetitors: 120 },
      'hvac': { industryAvg: 4.0, topPercentile: 4.7, ranking: 22, totalCompetitors: 60 },
      'plumbing': { industryAvg: 3.8, topPercentile: 4.6, ranking: 12, totalCompetitors: 45 },
      'default': { industryAvg: 4.1, topPercentile: 4.7, ranking: 10, totalCompetitors: 50 }
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
      topCompetitorRating: benchmark.topPercentile,
      ranking: benchmark.ranking,
      totalCompetitors: benchmark.totalCompetitors,
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
      'SELECT first_name, created_at FROM leads WHERE business_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 5',
      [businessId, 'converted']
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
