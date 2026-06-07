import db from '../config/database.js';

export const notifyOwnerOfNegativeReview = async (reviewId: string) => {
  try {
    const reviewResult = await db.query(
      'SELECT r.*, b.name as business_name, u.email as owner_email FROM reviews r JOIN businesses b ON r.business_id = b.id JOIN users u ON b.owner_id = u.id WHERE r.id = $1',
      [reviewId]
    );

    if (reviewResult.rows.length === 0) return;

    const review = reviewResult.rows[0];
    if (review.rating >= 4) return;

    console.log(`[ALERT] Negative review received for ${review.business_name}: ${review.rating} stars. Notify: ${review.owner_email}`);
    
    // In production, send email via SendGrid or SMS via Twilio
  } catch (error) {
    console.error('Error notifying owner of negative review:', error);
  }
};
