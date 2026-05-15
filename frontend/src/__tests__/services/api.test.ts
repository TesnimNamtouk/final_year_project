import axios from 'axios';
jest.mock('axios');

// axios.create mock — api.ts çağrısında bir sahte instance döner
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  defaults: { headers: { common: {} } },
};

(axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

describe('API Service', () => {
  it('should be importable', async () => {
    const { authAPI } = await import('../../services/api');
    expect(authAPI).toBeDefined();
    expect(typeof authAPI.login).toBe('function');
    expect(typeof authAPI.register).toBe('function');
  });

  it('authAPI should have required methods', async () => {
    const { authAPI } = await import('../../services/api');
    expect(typeof authAPI.me).toBe('function');
    expect(typeof authAPI.logout).toBe('function');
  });

  it('contentAPI should have search method', async () => {
    const { contentAPI } = await import('../../services/api');
    expect(contentAPI).toBeDefined();
    expect(typeof contentAPI.search).toBe('function');
  });

  it('userContentAPI should have CRUD methods', async () => {
    const { userContentAPI } = await import('../../services/api');
    expect(userContentAPI).toBeDefined();
    expect(typeof userContentAPI.save).toBe('function');
    expect(typeof userContentAPI.getAll).toBe('function');
    expect(typeof userContentAPI.patch).toBe('function');
    expect(typeof userContentAPI.delete).toBe('function');
  });

  it('recommendationsAPI should have get and feedback methods', async () => {
    const { recommendationsAPI } = await import('../../services/api');
    expect(recommendationsAPI).toBeDefined();
    expect(typeof recommendationsAPI.get).toBe('function');
    expect(typeof recommendationsAPI.feedback).toBe('function');
  });

  it('usersAPI should have updateProfile and onboarding methods', async () => {
    const { usersAPI } = await import('../../services/api');
    expect(usersAPI).toBeDefined();
    expect(typeof usersAPI.updateProfile).toBe('function');
    expect(typeof usersAPI.onboarding).toBe('function');
  });
});
