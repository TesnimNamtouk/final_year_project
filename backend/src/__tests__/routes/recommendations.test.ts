import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { generateAccessToken } from '../../utils/jwt';
import axios from 'axios';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    recommendation: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    userPreference: {
      findUnique: jest.fn().mockResolvedValue({ preferredGenres: ['Drama', 'Action'] }),
    },
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
jest.mock('axios');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.ML_SERVICE_URL = 'http://localhost:8000';

import { prisma } from '../../lib/prisma';

describe('GET /api/recommendations', () => {
  const app = createTestApp();
  const token = generateAccessToken({ userId: 1, email: 'test@test.com' });

  beforeEach(() => jest.clearAllMocks());

  it('should require auth', async () => {
    const res = await request(app).get('/api/recommendations');
    expect(res.status).toBe(401);
  });

  it('should return recommendations from DB when ML unavailable', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
    (prisma.recommendation.findMany as jest.Mock).mockResolvedValue([
      { id: 1, hybridScore: 0.9, content: { id: 1, title: 'Inception', type: 'movie' } }
    ]);

    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].content.title).toBe('Inception');
  });

  it('should return recommendations from ML service when available', async () => {
    const mlPayload = [
      { content_id: 2, hybrid_score: 0.95, cbf_score: 0.9, cf_score: 0.8 }
    ];
    (axios.post as jest.Mock).mockResolvedValue({ data: mlPayload });
    (prisma.recommendation.upsert as jest.Mock).mockResolvedValue({});
    (prisma.recommendation.findMany as jest.Mock).mockResolvedValue([
      { id: 2, hybridScore: 0.95, content: { id: 2, title: 'The Matrix', type: 'movie' } }
    ]);

    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(prisma.recommendation.upsert).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no recommendations exist', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
    (prisma.recommendation.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
