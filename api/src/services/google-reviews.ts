import { google } from 'googleapis';
import db from '../config/database.js';
import { notifyOwnerOfNegativeReview } from './notifications.js';

// Mocking the Google Business Profile API call
// In a real app, you'd use OAuth2 to get tokens for each business
export const fetchGoogleReviews = async (businessId: string) => {
  try {
    const businessResult = await db.query('SELECT google_place_id, google_access_token FROM businesses WHERE id = $1', [businessId]);
    if (businessResult.rows.length === 0) return [];
    
    const { google_place_id, google_access_token } = businessResult.rows[0];
    if (!google_place_id) return [];

    // Mock reviews for demonstration
    // In production, you'd use mybusinessbusinesscalls or similar
    const mockReviews = [
      {
        reviewId: 'rev_' + Math.random().toString(36).substr(2, 9),
        reviewer: { displayName: 'John Doe' },
        starRating: 'FIVE',
        comment: 'Great service! Highly recommend.',
        createTime: new Date().toISOString(),
      },
      {
        reviewId: 'rev_' + Math.random().toString(36).substr(2, 9),
        reviewer: { displayName: 'Jane Smith' },
        starRating: 'TWO',
        comment: 'The wait was too long.',
        createTime: new Date().toISOString(),
      }
    ];

    return mockReviews;
  } catch (error) {
    console.error('Error fetching Google reviews:', error);
    throw error;
  }
};

export const syncReviews = async (businessId: string) => {
  const reviews = await fetchGoogleReviews(businessId);
  
  for (const review of reviews) {
    const rating = review.starRating === 'FIVE' ? 5 : 
                   review.starRating === 'FOUR' ? 4 :
                   review.starRating === 'THREE' ? 3 :
                   review.starRating === 'TWO' ? 2 : 1;

    const inserted = await db.query(
      `INSERT INTO reviews (business_id, platform, external_id, reviewer_name, rating, comment, review_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (business_id, platform, external_id) DO NOTHING
       RETURNING id`,
      [businessId, 'google', review.reviewId, review.reviewer.displayName, rating, review.comment, review.createTime]
    );

    if (inserted.rows.length > 0 && rating < 4) {
      await notifyOwnerOfNegativeReview(inserted.rows[0].id);
    }
  }
};
