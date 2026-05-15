import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import bcrypt from 'bcryptjs';

// Prisma mock
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  }
}));

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

import { prisma } from '../../lib/prisma';

describe('POST /api/auth/register', () => {
  const app = createTestApp();

  beforeEach(() => jest.clearAllMocks());

  it('should register successfully', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 1, email: 'new@test.com', username: 'newuser', language: 'tr'
    });
    (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: 'password123', username: 'newuser' });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe('new@test.com');
  });

  it('should reject short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: '123', username: 'user' });
    expect(res.status).toBe(400);
  });

  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-email', password: 'password123', username: 'user' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const app = createTestApp();

  beforeEach(() => jest.clearAllMocks());

  it('should login with correct credentials', async () => {
    const hash = await bcrypt.hash('password123', 10);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1, email: 'test@test.com', username: 'testuser', passwordHash: hash, language: 'tr'
    });
    (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('should reject wrong password', async () => {
    const hash = await bcrypt.hash('correctpassword', 10);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1, email: 'test@test.com', username: 'testuser', passwordHash: hash
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('should reject non-existent user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});
