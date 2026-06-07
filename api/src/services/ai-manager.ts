import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateAIResponse = async (reviewText: string, rating: number, businessName: string) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return "Thank you for your feedback! We appreciate your business.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an AI assistant for a local business named "${businessName}". 
      Write a professional, friendly, and concise response to the following customer review.
      
      Review Rating: ${rating} stars
      Review Text: "${reviewText}"
      
      If the review is positive, thank them and mention we hope to see them again.
      If the review is negative (rating < 4), apologize, show empathy, and invite them to contact us privately to resolve the issue.
      
      Response:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating AI response:', error);
    return "Thank you for your feedback! We appreciate your business.";
  }
};
