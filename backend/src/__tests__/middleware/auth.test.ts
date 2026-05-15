import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { generateAccessToken } from '../../utils/jwt';

process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should call next() with valid token', () => {
    const token = generateAccessToken({ userId: 1, email: 'test@test.com' });
    mockReq.headers = { authorization: `Bearer ${token}` };
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
    expect((mockReq as any).user?.userId).toBe(1);
  });

  it('should return 401 without token', () => {
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 with invalid token', () => {
    mockReq.headers = { authorization: 'Bearer invalid.token' };
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});
