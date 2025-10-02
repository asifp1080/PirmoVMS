import { TemplateRegistry } from '../src/templates/template-registry';
import { NotificationEventType, NotificationProviderType } from '../src/types';

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  describe('default templates', () => {
    it('should load default templates on initialization', () => {
      const hostAlertSms = registry.getTemplate('host_alert_sms');
      expect(hostAlertSms).toBeDefined();
      expect(hostAlertSms?.type).toBe(NotificationEventType.HOST_ALERT);
      expect(hostAlertSms?.providerType).toBe(NotificationProviderType.SMS);
    });

    it('should have templates for all event types', () => {
      const eventTypes = Object.values(NotificationEventType);
      const providerTypes = Object.values(NotificationProviderType);

      eventTypes.forEach(eventType => {
        providerTypes.forEach(providerType => {
          const templates = registry.getTemplatesByType(eventType, providerType);
          expect(templates.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('template registration', () => {
    it('should register custom templates', () => {
      const customTemplate = {
        id: 'custom_test',
        name: 'Custom Test Template',
        type: NotificationEventType.HOST_ALERT,
        providerType: NotificationProviderType.SMS,
        textTemplate: 'Hello {{name}}!',
        variables: ['name'],
        isDefault: false,
      };

      registry.registerTemplate(customTemplate);
      const retrieved = registry.getTemplate('custom_test');
      expect(retrieved).toEqual(customTemplate);
    });
  });

  describe('template rendering', () => {
    it('should render text templates correctly', () => {
      const customTemplate = {
        id: 'test_render',
        name: 'Test Render Template',
        type: NotificationEventType.HOST_ALERT,
        providerType: NotificationProviderType.SMS,
        textTemplate: 'Hello {{visitor.firstName}} {{visitor.lastName}}!',
        variables: ['visitor.firstName', 'visitor.lastName'],
        isDefault: false,
      };

      registry.registerTemplate(customTemplate);

      const rendered = registry.renderTemplate('test_render', {
        visitor: {
          firstName: 'John',
          lastName: 'Doe',
        },
      });

      expect(rendered.text).toBe('Hello John Doe!');
    });

    it('should render subject templates correctly', () => {
      const customTemplate = {
        id: 'test_subject',
        name: 'Test Subject Template',
        type: NotificationEventType.VISITOR_CONFIRMATION,
        providerType: NotificationProviderType.EMAIL,
        subject: 'Welcome {{visitor.firstName}}!',
        textTemplate: 'Your visit is confirmed.',
        variables: ['visitor.firstName'],
        isDefault: false,
      };

      registry.registerTemplate(customTemplate);

      const rendered = registry.renderTemplate('test_subject', {
        visitor: {
          firstName: 'Jane',
        },
      });

      expect(rendered.subject).toBe('Welcome Jane!');
      expect(rendered.text).toBe('Your visit is confirmed.');
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        registry.renderTemplate('non_existent', {});
      }).toThrow('Template not found: non_existent');
    });
  });

  describe('template filtering', () => {
    it('should filter templates by type', () => {
      const hostAlertTemplates = registry.getTemplatesByType(NotificationEventType.HOST_ALERT);
      expect(hostAlertTemplates.length).toBeGreaterThan(0);
      hostAlertTemplates.forEach(template => {
        expect(template.type).toBe(NotificationEventType.HOST_ALERT);
      });
    });

    it('should filter templates by type and provider', () => {
      const smsTemplates = registry.getTemplatesByType(
        NotificationEventType.HOST_ALERT,
        NotificationProviderType.SMS
      );
      expect(smsTemplates.length).toBeGreaterThan(0);
      smsTemplates.forEach(template => {
        expect(template.type).toBe(NotificationEventType.HOST_ALERT);
        expect(template.providerType).toBe(NotificationProviderType.SMS);
      });
    });
  });
});