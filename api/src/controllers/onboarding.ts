import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const startOnboarding = async (req: AuthRequest, res: Response) => {
    try {
        const { businessId } = req.body;

        if (!businessId) {
            return res.status(400).json({ error: 'businessId is required' });
        }

        const result = await db.query(
            `INSERT INTO onboarding_progress (business_id, current_step)
             VALUES ($1, $2)
             ON CONFLICT (business_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [businessId, 1]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Start Onboarding Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const saveOnboardingStep = async (req: AuthRequest, res: Response) => {
    try {
        const { businessId, step, data } = req.body;

        if (!businessId || !step) {
            return res.status(400).json({ error: 'businessId and step are required' });
        }

        const result = await db.query(
            `UPDATE onboarding_progress 
             SET current_step = $1, data = data || $2::jsonb, updated_at = CURRENT_TIMESTAMP
             WHERE business_id = $3
             RETURNING *`,
            [step, JSON.stringify(data || {}), businessId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Onboarding progress not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Save Onboarding Step Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getOnboardingProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { businessId } = req.query;

        if (!businessId) {
            return res.status(400).json({ error: 'businessId is required' });
        }

        const result = await db.query(
            'SELECT * FROM onboarding_progress WHERE business_id = $1',
            [businessId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Onboarding progress not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get Onboarding Progress Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const completeOnboarding = async (req: AuthRequest, res: Response) => {
    try {
        const { businessId } = req.body;

        if (!businessId) {
            return res.status(400).json({ error: 'businessId is required' });
        }

        const result = await db.query(
            `UPDATE onboarding_progress 
             SET is_completed = TRUE, updated_at = CURRENT_TIMESTAMP
             WHERE business_id = $1
             RETURNING *`,
            [businessId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Onboarding progress not found' });
        }

        res.json({ message: 'Onboarding completed successfully', progress: result.rows[0] });
    } catch (error) {
        console.error('Complete Onboarding Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
