import { SendGridEmailProvider } from '../src/providers/sendgrid-email.provider';
import { NotificationProviderType } from '../src/types';

describe('SendGridEmailProvider', () => {
  let provider: SendGridEmailProvider;
  
  const mockConfig = {
    apiKey: 'test_api_key',
    from: 'test@example.com',
    fromName: 'Test Sender',
  };

  beforeEach(() => {
    provider = new SendGridEmailProvider(mockConfig);
  });

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should return false for invalid config', () => {
      const invalidProvider = new SendGridEmailProvider({
        apiKey: '',
        from: 'test@example.com',
      });
      expect(invalidProvider.validateConfig()).toBe(false);
    });
  });

  describe('provider properties', () => {
    it('should have correct name and type', () => {
      expect(provider.name).toBe('sendgrid');
      expect(provider.type).toBe(NotificationProviderType.EMAIL);
    });
  });

  describe('send', () => {
    it('should handle invalid config gracefully', async () => {
      const invalidProvider = new SendGridEmailProvider({
        apiKey: '',
        from: '',
      });

      const result = await invalidProvider.send({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid SendGrid configuration');
      expect(result.provider).toBe('sendgrid');
    });
  });
});