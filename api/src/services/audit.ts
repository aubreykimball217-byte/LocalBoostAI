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

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const reviewCountScore = Math.min(reviews.length / 50, 1) * 20; // Max 20 points for 50+ reviews
    const ratingScore = (avgRating / 5) * 60; // Max 60 points for 5.0 rating
    
    // Response rate score (mocked for now, assume 50% response rate)
    const responseRateScore = 0.5 * 20; // Max 20 points

    return Math.round(reviewCountScore + ratingScore + responseRateScore);
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
            doc.fontSize(25).text('LocalBoost AI - Reputation Audit Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(18).text(`Business: ${data.businessName}`);
            doc.fontSize(12).text(`Generated for: ${data.email}`);
            doc.moveDown();

            // Reputation Score
            doc.fontSize(20).text(`Reputation Score: ${score}/100`, { align: 'center' });
            doc.moveDown();

            // Analysis
            doc.fontSize(14).text('Detailed Analysis:');
            doc.moveDown(0.5);
            doc.fontSize(12).text(`- Average Rating: ${(score / 20).toFixed(1)} / 5.0`);
            doc.text(`- Review Count: ${data.reviews.length} reviews analyzed`);
            doc.text('- Response Rate: 50% (Industry Avg: 75%)');
            doc.moveDown();

            // Recommendations
            doc.fontSize(14).text('Recommendations:');
            doc.moveDown(0.5);
            doc.fontSize(12).text('1. Increase review volume: Start sending SMS/Email requests to every customer.');
            doc.text('2. Improve response rate: Use AI to respond to all reviews within 24 hours.');
            doc.text('3. Monitor negative feedback: Address complaints privately before they hit Google.');
            
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
            { rating: 3, comment: 'Average.' },
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

        // TODO: Trigger nurture sequence (send email)
        console.log(`Audit ${auditId} completed with score ${score}`);
    } catch (error) {
        console.error(`Audit ${auditId} failed:`, error);
        await db.query('UPDATE audits SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['failed', auditId]);
    }
};
