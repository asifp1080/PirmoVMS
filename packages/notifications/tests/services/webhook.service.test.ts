import { WebhookService } from '../src/services/webhook.service';
import { WebhookConfig } from '../src/types';
import * as crypto from 'crypto';

describe('WebhookService', () => {
  let webhookService: WebhookService;

  beforeEach(() => {
    webhookService = new WebhookService();
  });

  describe('webhook registration', () => {
    it('should register webhooks', () => {
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        secret: 'test_secret',
        events: ['visit.created', 'visit.checked_in'],
        isActive: true,
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelayMs: 1000,
        },
      };

      webhookService.registerWebhook('test_webhook', config);
      const webhooks = webhookService.getWebhooks();
      expect(webhooks.get('test_webhook')).toEqual(config);
    });

    it('should unregister webhooks', () => {
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        secret: 'test_secret',
        events: ['visit.created'],
        isActive: true,
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelayMs: 1000,
        },
      };

      webhookService.registerWebhook('test_webhook', config);
      webhookService.unregisterWebhook('test_webhook');
      
      const webhooks = webhookService.getWebhooks();
      expect(webhooks.has('test_webhook')).toBe(false);
    });
  });

  describe('signature validation', () => {
    it('should validate correct signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test_secret';
      const nonce = 'test_nonce';
      
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      const isValid = webhookService.validateWebhookSignature(
        payload,
        signature,
        secret,
        nonce
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test_secret';
      const wrongSignature = 'invalid_signature';
      const nonce = 'test_nonce';

      const isValid = webhookService.validateWebhookSignature(
        payload,
        wrongSignature,
        secret,
        nonce
      );

      expect(isValid).toBe(false);
    });

    it('should reject replay attacks with same nonce', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test_secret';
      const nonce = 'test_nonce';
      
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      // First request should be valid
      const firstValid = webhookService.validateWebhookSignature(
        payload,
        signature,
        secret,
        nonce
      );
      expect(firstValid).toBe(true);

      // Second request with same nonce should be rejected
      const secondValid = webhookService.validateWebhookSignature(
        payload,
        signature,
        secret,
        nonce
      );
      expect(secondValid).toBe(false);
    });
  });

  describe('webhook testing', () => {
    it('should throw error for non-existent webhook', async () => {
      await expect(webhookService.testWebhook('non_existent')).rejects.toThrow(
        'Webhook not found: non_existent'
      );
    });
  });
});