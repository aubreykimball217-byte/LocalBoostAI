import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AuditData {
    businessName: string;
    businessUrl?: string;
    email: string;
    reviews: any[];
}

export const calculateReputationScore = (reviews: any[]) => {
    if (reviews.length === 0) return 0;

    // 1. Weighted Average Rating (40%)
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const ratingScore = (avgRating / 5) * 40;

    // 2. Review Count vs Industry Average (20%)
    // Assume industry average is 50 reviews
    const industryAvgCount = 50;
    const countScore = Math.min(reviews.length / industryAvgCount, 1) * 20;

    // 3. Response Rate (15%)
    // Mocked: assume 60% response rate
    const responseRate = 0.6;
    const responseScore = responseRate * 15;

    // 4. Recency of Reviews (15%)
    // Mocked: assume 80% recency (most reviews in last 6 months)
    const recencyScore = 0.8 * 15;

    // 5. Sentiment Diversity (10%)
    // Mocked: assume 90% positive sentiment diversity
    const sentimentScore = 0.9 * 10;

    return Math.round(ratingScore + countScore + responseScore + recencyScore + sentimentScore);
};

export const generateAuditReport = async (auditId: string, data: AuditData, score: number) => {
    return new Promise<string>((resolve, reject) => {
        try {
            const reportsDir = path.join(__dirname, '../../../public/reports');
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }

            const fileName = `audit_${auditId}.pdf`;
            const filePath = path.join(reportsDir, fileName);
            const doc = new PDFDocument();

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Report Header
            doc.fontSize(25).fillColor('#1e40af').text('LocalBoost AI', { align: 'center' });
            doc.fontSize(20).fillColor('#333').text('Reputation Audit Report', { align: 'center' });
            doc.moveDown();
            
            doc.fontSize(14).text(`Business: ${data.businessName}`);
            doc.fontSize(12).text(`Generated for: ${data.email}`);
            doc.text(`Date: ${new Date().toLocaleDateString()}`);
            doc.moveDown();

            // Reputation Score (Big Number)
            const scoreColor = score >= 80 ? '#16a34a' : (score >= 60 ? '#ca8a04' : '#dc2626');
            doc.fontSize(18).text('Your Reputation Score', { align: 'center' });
            doc.fontSize(60).fillColor(scoreColor).text(`${score}`, { align: 'center' });
            doc.fontSize(14).fillColor('#666').text('out of 100', { align: 'center' });
            doc.moveDown();

            // Breakdown
            doc.fillColor('#333').fontSize(16).text('Rating Distribution', { underline: true });
            doc.moveDown(0.5);
            
            const ratings = [5, 4, 3, 2, 1];
            ratings.forEach(r => {
                const count = data.reviews.filter(rev => Math.round(rev.rating) === r).length;
                const barWidth = (count / data.reviews.length) * 300;
                doc.fontSize(12).text(`${r} Stars: ${count} reviews`);
                doc.rect(doc.x + 100, doc.y - 12, barWidth, 10).fill('#3b82f6');
                doc.moveDown(0.2);
            });
            doc.moveDown();

            // Strengths & Weaknesses
            doc.fontSize(16).fillColor('#333').text('Strengths & Weaknesses');
            doc.moveDown(0.5);
            doc.fontSize(12).fillColor('#333').text('✔ High average rating compared to local peers.');
            doc.text('✔ Consistent brand voice in responses.');
            doc.fillColor('#dc2626').text('✘ Low review volume (Top 10% have 3x more reviews).');
            doc.text('✘ 40% of reviews go unanswered.');
            doc.fillColor('#333');
            doc.moveDown();

            // Recommendations
            doc.fontSize(16).text('Top 3 Actionable Recommendations');
            doc.moveDown(0.5);
            doc.fontSize(12).text('1. Automate Review Requests: Send SMS reminders immediately after service.');
            doc.text('2. Reactivate Past Customers: Run a "We Miss You" campaign to get fresh reviews.');
            doc.text('3. AI-Powered Responses: Respond to every review to boost your ranking by up to 20%.');
            
            doc.end();

            stream.on('finish', () => {
                resolve(`/reports/${fileName}`);
            });
        } catch (error) {
            reject(error);
        }
    });
};

export const runAudit = async (auditId: string) => {
    try {
        const result = await db.query('SELECT * FROM audits WHERE id = $1', [auditId]);
        if (result.rows.length === 0) return;

        const audit = result.rows[0];
        
        // Mock scanning reviews
        const mockReviews = [
            { rating: 5, comment: 'Excellent!' },
            { rating: 4, comment: 'Very good.' },
            { rating: 2, comment: 'Could be better.' },
            { rating: 5, comment: 'Amazing service.' },
            { rating: 4, comment: 'Satisfied.' },
        ];

        const score = calculateReputationScore(mockReviews);
        const reportUrl = await generateAuditReport(auditId, {
            businessName: audit.business_name,
            businessUrl: audit.business_url,
            email: audit.email,
            reviews: mockReviews
        }, score);

        await db.query(
            'UPDATE audits SET score = $1, report_url = $2, results = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
            [score, reportUrl, JSON.stringify(mockReviews), 'completed', auditId]
        );

        // Nurture Sequence logic (simulated)
        console.log(`Audit ${auditId} completed. Sending "Report Ready" email to ${audit.email}...`);
        
    } catch (error) {
        console.error(`Audit ${auditId} failed:`, error);
        await db.query('UPDATE audits SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['failed', auditId]);
    }
};
