// src/app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Mock user database - in production, this would be a real database
const users = [
  {
    id: 1,
    username: 'test',
    password: '$2b$10$rnc8gikcLcRgwIzQeybCduBe1bfLXnD43BFvxPBOkoN8RKzy2p9Jq', // Admin123
    email: 'test@example.com'
  },
  // Demo account for Togher
  {
    id: 2,
    username: 'Togher',
    password: '$2b$10$rnc8gikcLcRgwIzQeybCduBe1bfLXnD43BFvxPBOkoN8RKzy2p9Jq', // Admin123
    email: 'togher@example.com'
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user in database
    const user = users.find(u => u.username === username);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
