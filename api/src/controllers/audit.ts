import { Request, Response } from 'express';
import db from '../config/database.js';
import { runAudit } from '../services/audit.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const startAudit = async (req: Request, res: Response) => {
    try {
        const { businessName, businessUrl, email } = req.body;

        if (!businessName || !email) {
            return res.status(400).json({ error: 'businessName and email are required' });
        }

        const result = await db.query(
            `INSERT INTO audits (business_name, business_url, email, status)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [businessName, businessUrl, email, 'pending']
        );

        const newAudit = result.rows[0];

        // Run audit in background
        runAudit(newAudit.id).catch(console.error);

        res.status(201).json({
            message: 'Audit started',
            auditId: newAudit.id
        });
    } catch (error) {
        console.error('Start Audit Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getAuditStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await db.query('SELECT * FROM audits WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Audit not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get Audit Status Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const downloadReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await db.query('SELECT report_url FROM audits WHERE id = $1', [id]);
        if (result.rows.length === 0 || !result.rows[0].report_url) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const reportUrl = result.rows[0].report_url;
        const filePath = path.join(__dirname, '../../../public', reportUrl);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Report file not found' });
        }

        res.download(filePath);
    } catch (error) {
        console.error('Download Report Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
