import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const getOnboardingStatus = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const businessResult = await db.query('SELECT * FROM businesses WHERE owner_id = $1', [userId]);
        
        if (businessResult.rows.length === 0) {
            return res.json({ step: 'create_business', completed: false });
        }

        const business = businessResult.rows[0];
        
        const steps = {
            businessCreated: true,
            googleConnected: !!business.google_access_token,
            reviewRequestsConfigured: false, // Check if any review request template exists
            firstCampaignCreated: false      // Check if any campaign exists
        };

        // Check for review requests config
        const campaignsResult = await db.query('SELECT type FROM campaigns WHERE business_id = $1', [business.id]);
        steps.reviewRequestsConfigured = campaignsResult.rows.some(c => c.type === 'review_request');
        steps.firstCampaignCreated = campaignsResult.rows.length > 0;

        res.json(steps);
    } catch (error) {
        console.error('Get Onboarding Status Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const completeOnboardingStep = async (req: AuthRequest, res: Response) => {
    try {
        const { step, data } = req.body;
        const userId = req.user?.id;

        // In a real app, logic for each step would be more complex
        res.json({ message: `Step ${step} completed successfully` });
    } catch (error) {
        console.error('Complete Onboarding Step Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
