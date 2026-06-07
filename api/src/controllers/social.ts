import { Request, Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateSocialPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, topic, platforms, count } = req.body;

    if (!businessId || !platforms || !count) {
      return res.status(400).json({ error: 'businessId, platforms, and count are required' });
    }

    const businessResult = await db.query('SELECT name, industry FROM businesses WHERE id = $1', [businessId]);
    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = businessResult.rows[0];
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Generate ${count} social media posts for a business named "${business.name}" in the "${business.industry}" industry.
      Topic: ${topic || 'General promotion and customer engagement'}
      Platforms: ${platforms.join(', ')}
      
      For each post, provide:
      1. Platform
      2. Content (engaging, professional, includes relevant hashtags)
      3. Suggested image description
      
      Format the output as a JSON array of objects:
      [
        { "platform": "facebook", "content": "...", "imageDescription": "..." },
        ...
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response text (Gemini sometimes adds markdown blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const generatedPosts = JSON.parse(jsonMatch[0]);

    // Save generated posts as drafts
    const savedPosts = [];
    for (const post of generatedPosts) {
      const insertResult = await db.query(
        'INSERT INTO social_posts (business_id, platform, content, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [businessId, post.platform, post.content, 'draft']
      );
      savedPosts.push(insertResult.rows[0]);
    }

    res.json({ message: 'Social media posts generated successfully', posts: savedPosts });
  } catch (error: any) {
    console.error('Generate Social Posts Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const getSocialPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const result = await db.query(
      'SELECT * FROM social_posts WHERE business_id = $1 ORDER BY created_at DESC',
      [businessId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const schedulePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt is required' });
    }

    const result = await db.query(
      'UPDATE social_posts SET scheduled_at = $1, status = $2 WHERE id = $3 RETURNING *',
      [scheduledAt, 'scheduled', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateSocialPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, imageUrl } = req.body;

    const result = await db.query(
      'UPDATE social_posts SET content = COALESCE($1, content), image_url = COALESCE($2, image_url), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [content, imageUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteSocialPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM social_posts WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post deleted', id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getSocialTemplates = async (req: AuthRequest, res: Response) => {
  const templates = [
    { id: 'dental', name: 'Dental Practice' },
    { id: 'salon', name: 'Hair & Beauty Salon' },
    { id: 'hvac', name: 'HVAC Services' },
    { id: 'plumbing', name: 'Plumbing Services' },
    { id: 'chiropractic', name: 'Chiropractic Clinic' },
    { id: 'roofing', name: 'Roofing Contractor' },
    { id: 'general', name: 'General Local Business' },
  ];
  res.json(templates);
};
