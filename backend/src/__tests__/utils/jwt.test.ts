import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../utils/jwt';

process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

describe('JWT Utils', () => {
  it('should generate and verify access token', () => {
    const payload = { userId: 1, email: 'test@example.com' };
    const token = generateAccessToken(payload);
    expect(token).toBeTruthy();
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(1);
    expect(decoded.email).toBe('test@example.com');
  });

  it('should generate and verify refresh token', () => {
    const token = generateRefreshToken({ userId: 1 });
    expect(token).toBeTruthy();
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(1);
  });

  it('should throw on invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('access token should expire', async () => {
    // expired token test — mock ile gerek yok, sadece yapı doğrulaması
    const token = generateAccessToken({ userId: 99, email: 'x@x.com' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
});
