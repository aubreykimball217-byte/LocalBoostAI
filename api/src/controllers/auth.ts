import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';
import db from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { email, password, firstName, lastName } = validatedData;

    const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role',
      [email, passwordHash, firstName, lastName, 'owner']
    );

    const user = newUser.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.status(201).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const result = await db.query('SELECT id, email, password_hash, role FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete user.password_hash;

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify token exists in DB
    const tokenResult = await db.query('SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()', [refreshToken]);
    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const result = await db.query('SELECT id, email, role FROM users WHERE id = $1 AND deleted_at IS NULL', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    const user = result.rows[0];
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Rotate refresh token: delete old, store new
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, newRefreshToken, expiresAt]
    );

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length > 0) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour
      
      await db.query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
        [resetToken, expiresAt, email]
      );
      
      // Placeholder for sending email
      console.log(`Password reset email would be sent to ${email} with token: ${resetToken}`);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If a user with that email exists, a reset link has been sent' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    
    const userResult = await db.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const userId = userResult.rows[0].id;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, userId]
    );

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getProfile = async (req: any, res: Response) => {
  try {
    const result = await db.query(
      'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);
    const { firstName, lastName, email } = validatedData;
    
    const sets = [];
    const values = [];
    let i = 1;
    
    if (firstName) {
      sets.push(`first_name = $${i++}`);
      values.push(firstName);
    }
    if (lastName) {
      sets.push(`last_name = $${i++}`);
      values.push(lastName);
    }
    if (email) {
      // Check if email already taken
      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      sets.push(`email = $${i++}`);
      values.push(email);
    }
    
    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.user.id);
    const query = `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, email, first_name, last_name, role`;
    
    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
