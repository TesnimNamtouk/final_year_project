import { Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

describe('Validate Middleware', () => {
  it('should pass valid data', () => {
    const schema = z.object({ body: z.object({ name: z.string() }) });
    const middleware = validate(schema);
    const req = { body: { name: 'test' } } as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject invalid data with 400', () => {
    const schema = z.object({ body: z.object({ email: z.string().email() }) });
    const middleware = validate(schema);
    const req = { body: { email: 'not-an-email' } } as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
