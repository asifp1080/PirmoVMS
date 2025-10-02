// Global test setup
beforeEach(() => {
  // Reset any global state
  jest.clearAllMocks();
});

// Mock external dependencies
jest.mock('twilio', () => ({
  default: jest.fn(() => ({
    messages: {
      create: jest.fn(),
    },
  })),
}));

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
}));