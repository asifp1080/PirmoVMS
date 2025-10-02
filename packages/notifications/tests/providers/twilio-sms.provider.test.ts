import { TwilioSmsProvider } from '../src/providers/twilio-sms.provider';
import { NotificationProviderType } from '../src/types';

describe('TwilioSmsProvider', () => {
  let provider: TwilioSmsProvider;
  
  const mockConfig = {
    accountSid: 'test_account_sid',
    authToken: 'test_auth_token',
    from: '+1234567890',
  };

  beforeEach(() => {
    provider = new TwilioSmsProvider(mockConfig);
  });

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should return false for invalid config', () => {
      const invalidProvider = new TwilioSmsProvider({
        accountSid: '',
        authToken: 'test',
        from: '+1234567890',
      });
      expect(invalidProvider.validateConfig()).toBe(false);
    });
  });

  describe('provider properties', () => {
    it('should have correct name and type', () => {
      expect(provider.name).toBe('twilio');
      expect(provider.type).toBe(NotificationProviderType.SMS);
    });
  });

  describe('send', () => {
    it('should handle invalid config gracefully', async () => {
      const invalidProvider = new TwilioSmsProvider({
        accountSid: '',
        authToken: '',
        from: '',
      });

      const result = await invalidProvider.send({
        to: '+1234567890',
        text: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Twilio configuration');
      expect(result.provider).toBe('twilio');
    });
  });
});