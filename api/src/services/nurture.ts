import db from '../config/database.js';
import { sendEmail } from './email.js';

export const processAuditNurture = async () => {
    try {
        // Step 0: Immediate "Report Ready" (Sent right after audit completion)
        // This is handled in the audit service already or can be done here.

        // Step 1: Day 1 "Top 3 ways"
        const day1Audits = await db.query(
            `SELECT * FROM audits 
             WHERE nurture_step = 0 
             AND email != 'anonymous'
             AND updated_at < CURRENT_TIMESTAMP - INTERVAL '1 day'`
        );

        for (const audit of day1Audits.rows) {
            await sendEmail(
                audit.email,
                'Top 3 ways to improve your Reputation Score',
                'Here are 3 actionable tips...',
                '<h1>Top 3 ways to improve your score</h1><ul><li>Tip 1...</li></ul>'
            );
            await db.query('UPDATE audits SET nurture_step = 1, last_nurture_at = CURRENT_TIMESTAMP WHERE id = $1', [audit.id]);
        }

        // Step 2: Day 3 "Automation"
        const day3Audits = await db.query(
            `SELECT * FROM audits 
             WHERE nurture_step = 1 
             AND last_nurture_at < CURRENT_TIMESTAMP - INTERVAL '2 days'`
        );

        for (const audit of day3Audits.rows) {
            await sendEmail(
                audit.email,
                'See how LocalBoost AI automates your reputation',
                'Automation is key...',
                '<h1>Automate your growth</h1>'
            );
            await db.query('UPDATE audits SET nurture_step = 2, last_nurture_at = CURRENT_TIMESTAMP WHERE id = $1', [audit.id]);
        }

        // Step 3: Day 7 "Free Trial"
        const day7Audits = await db.query(
            `SELECT * FROM audits 
             WHERE nurture_step = 2 
             AND last_nurture_at < CURRENT_TIMESTAMP - INTERVAL '4 days'`
        );

        for (const audit of day7Audits.rows) {
            await sendEmail(
                audit.email,
                'Exclusive Invite: 14-Day Free Trial of LocalBoost AI',
                'Start your trial...',
                '<h1>Start your free trial today</h1>'
            );
            await db.query('UPDATE audits SET nurture_step = 3, last_nurture_at = CURRENT_TIMESTAMP WHERE id = $1', [audit.id]);
        }

    } catch (error) {
        console.error('Nurture Process Error:', error);
    }
};
