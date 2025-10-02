import { NotificationTemplate, NotificationEventType, NotificationProviderType } from '../types';
import * as Handlebars from 'handlebars';
import * as mjml from 'mjml';

export class TemplateRegistry {
  private templates: Map<string, NotificationTemplate> = new Map();
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates() {
    // Host Alert Templates
    this.registerTemplate({
      id: 'host_alert_sms',
      name: 'Host Alert SMS',
      type: NotificationEventType.HOST_ALERT,
      providerType: NotificationProviderType.SMS,
      textTemplate: `🏢 Visitor Alert: {{visitor.firstName}} {{visitor.lastName}} from {{visitor.company}} has checked in to see you. Badge: {{visit.badgeNumber}}. Location: {{location.name}}.`,
      variables: ['visitor.firstName', 'visitor.lastName', 'visitor.company', 'visit.badgeNumber', 'location.name'],
      isDefault: true,
    });

    this.registerTemplate({
      id: 'host_alert_email',
      name: 'Host Alert Email',
      type: NotificationEventType.HOST_ALERT,
      providerType: NotificationProviderType.EMAIL,
      subject: 'Visitor {{visitor.firstName}} {{visitor.lastName}} has arrived',
      textTemplate: `Hello {{host.firstName}},

{{visitor.firstName}} {{visitor.lastName}} from {{visitor.company}} has checked in and is here to see you.

Visit Details:
- Purpose: {{visit.purpose}}
- Check-in Time: {{visit.checkInTime}}
- Badge Number: {{visit.badgeNumber}}
- Location: {{location.name}}

Please meet them at the reception area.

Best regards,
Visitor Management System`,
      htmlTemplate: this.getHostAlertEmailTemplate(),
      variables: ['host.firstName', 'visitor.firstName', 'visitor.lastName', 'visitor.company', 'visit.purpose', 'visit.checkInTime', 'visit.badgeNumber', 'location.name'],
      isDefault: true,
    });

    this.registerTemplate({
      id: 'host_alert_slack',
      name: 'Host Alert Slack',
      type: NotificationEventType.HOST_ALERT,
      providerType: NotificationProviderType.CHAT,
      textTemplate: `👋 *Visitor Alert*
{{visitor.firstName}} {{visitor.lastName}} from *{{visitor.company}}* has checked in to see you.
📍 Location: {{location.name}}
🎫 Badge: {{visit.badgeNumber}}
⏰ Time: {{visit.checkInTime}}`,
      variables: ['visitor.firstName', 'visitor.lastName', 'visitor.company', 'location.name', 'visit.badgeNumber', 'visit.checkInTime'],
      isDefault: true,
    });

    // Visitor Confirmation Templates
    this.registerTemplate({
      id: 'visitor_confirmation_sms',
      name: 'Visitor Confirmation SMS',
      type: NotificationEventType.VISITOR_CONFIRMATION,
      providerType: NotificationProviderType.SMS,
      textTemplate: `Welcome to {{organization.name}}! Your visit is confirmed for {{visit.scheduledStart}}. Host: {{host.firstName}} {{host.lastName}}. QR Code: {{visit.qrCode}}`,
      variables: ['organization.name', 'visit.scheduledStart', 'host.firstName', 'host.lastName', 'visit.qrCode'],
      isDefault: true,
    });

    this.registerTemplate({
      id: 'visitor_confirmation_email',
      name: 'Visitor Confirmation Email',
      type: NotificationEventType.VISITOR_CONFIRMATION,
      providerType: NotificationProviderType.EMAIL,
      subject: 'Visit Confirmation - {{organization.name}}',
      textTemplate: `Dear {{visitor.firstName}},

Your visit to {{organization.name}} has been confirmed!

Visit Details:
- Date & Time: {{visit.scheduledStart}}
- Host: {{host.firstName}} {{host.lastName}}
- Location: {{location.name}}
- Address: {{location.address}}

Please use the QR code below for quick check-in: {{visit.qrCode}}

We look forward to seeing you!

Best regards,
{{organization.name}}`,
      htmlTemplate: this.getVisitorConfirmationEmailTemplate(),
      variables: ['visitor.firstName', 'organization.name', 'visit.scheduledStart', 'host.firstName', 'host.lastName', 'location.name', 'location.address', 'visit.qrCode'],
      isDefault: true,
    });

    // Checkout Alert Templates
    this.registerTemplate({
      id: 'checkout_alert_sms',
      name: 'Checkout Alert SMS',
      type: NotificationEventType.CHECKOUT_ALERT,
      providerType: NotificationProviderType.SMS,
      textTemplate: `{{visitor.firstName}} {{visitor.lastName}} has checked out. Visit duration: {{visit.duration}}. Thank you for hosting!`,
      variables: ['visitor.firstName', 'visitor.lastName', 'visit.duration'],
      isDefault: true,
    });

    this.registerTemplate({
      id: 'checkout_alert_email',
      name: 'Checkout Alert Email',
      type: NotificationEventType.CHECKOUT_ALERT,
      providerType: NotificationProviderType.EMAIL,
      subject: 'Visitor {{visitor.firstName}} {{visitor.lastName}} has checked out',
      textTemplate: `Hello {{host.firstName}},

{{visitor.firstName}} {{visitor.lastName}} from {{visitor.company}} has checked out.

Visit Summary:
- Check-in: {{visit.checkInTime}}
- Check-out: {{visit.checkOutTime}}
- Duration: {{visit.duration}}
- Purpose: {{visit.purpose}}

Thank you for hosting!

Best regards,
Visitor Management System`,
      htmlTemplate: this.getCheckoutAlertEmailTemplate(),
      variables: ['host.firstName', 'visitor.firstName', 'visitor.lastName', 'visitor.company', 'visit.checkInTime', 'visit.checkOutTime', 'visit.duration', 'visit.purpose'],
      isDefault: true,
    });
  }

  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    
    // Compile text template
    const compiledText = Handlebars.compile(template.textTemplate);
    this.compiledTemplates.set(`${template.id}_text`, compiledText);
    
    // Compile HTML template if exists
    if (template.htmlTemplate) {
      const compiledHtml = Handlebars.compile(template.htmlTemplate);
      this.compiledTemplates.set(`${template.id}_html`, compiledHtml);
    }
  }

  getTemplate(id: string): NotificationTemplate | undefined {
    return this.templates.get(id);
  }

  getTemplatesByType(type: NotificationEventType, providerType?: NotificationProviderType): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter(template => {
      return template.type === type && (!providerType || template.providerType === providerType);
    });
  }

  renderTemplate(templateId: string, data: Record<string, any>): { text: string; html?: string; subject?: string } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const textCompiled = this.compiledTemplates.get(`${templateId}_text`);
    if (!textCompiled) {
      throw new Error(`Compiled text template not found: ${templateId}`);
    }

    const result: { text: string; html?: string; subject?: string } = {
      text: textCompiled(data),
    };

    // Render HTML if template exists
    const htmlCompiled = this.compiledTemplates.get(`${templateId}_html`);
    if (htmlCompiled) {
      const htmlContent = htmlCompiled(data);
      
      // If it's an MJML template, compile it
      if (htmlContent.includes('<mjml>')) {
        const mjmlResult = mjml(htmlContent);
        if (mjmlResult.errors.length === 0) {
          result.html = mjmlResult.html;
        } else {
          console.warn('MJML compilation errors:', mjmlResult.errors);
          result.html = htmlContent;
        }
      } else {
        result.html = htmlContent;
      }
    }

    // Render subject if exists
    if (template.subject) {
      const subjectCompiled = Handlebars.compile(template.subject);
      result.subject = subjectCompiled(data);
    }

    return result;
  }

  private getHostAlertEmailTemplate(): string {
    return `<mjml>
  <mj-head>
    <mj-title>Visitor Alert</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        <mj-text font-size="24px" color="#2563EB" font-weight="bold" align="center">
          Visitor Alert
        </mj-text>
        <mj-divider border-color="#e5e7eb" />
        <mj-text font-size="16px" color="#374151">
          Hello {{host.firstName}},
        </mj-text>
        <mj-text font-size="16px" color="#374151">
          <strong>{{visitor.firstName}} {{visitor.lastName}}</strong> from <strong>{{visitor.company}}</strong> has checked in and is here to see you.
        </mj-text>
        <mj-section background-color="#f9fafb" padding="15px" border-radius="8px">
          <mj-column>
            <mj-text font-size="14px" color="#6b7280" font-weight="bold">Visit Details:</mj-text>
            <mj-text font-size="14px" color="#374151">
              • Purpose: {{visit.purpose}}<br/>
              • Check-in Time: {{visit.checkInTime}}<br/>
              • Badge Number: {{visit.badgeNumber}}<br/>
              • Location: {{location.name}}
            </mj-text>
          </mj-column>
        </mj-section>
        <mj-text font-size="16px" color="#374151">
          Please meet them at the reception area.
        </mj-text>
        <mj-text font-size="14px" color="#6b7280">
          Best regards,<br/>
          Visitor Management System
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
  }

  private getVisitorConfirmationEmailTemplate(): string {
    return `<mjml>
  <mj-head>
    <mj-title>Visit Confirmation</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        <mj-text font-size="24px" color="#10b981" font-weight="bold" align="center">
          Visit Confirmed
        </mj-text>
        <mj-divider border-color="#e5e7eb" />
        <mj-text font-size="16px" color="#374151">
          Dear {{visitor.firstName}},
        </mj-text>
        <mj-text font-size="16px" color="#374151">
          Your visit to <strong>{{organization.name}}</strong> has been confirmed!
        </mj-text>
        <mj-section background-color="#f0fdf4" padding="15px" border-radius="8px">
          <mj-column>
            <mj-text font-size="14px" color="#166534" font-weight="bold">Visit Details:</mj-text>
            <mj-text font-size="14px" color="#374151">
              • Date & Time: {{visit.scheduledStart}}<br/>
              • Host: {{host.firstName}} {{host.lastName}}<br/>
              • Location: {{location.name}}<br/>
              • Address: {{location.address}}
            </mj-text>
          </mj-column>
        </mj-section>
        <mj-text font-size="16px" color="#374151">
          Please use the QR code below for quick check-in:
        </mj-text>
        <mj-text font-size="24px" color="#2563EB" font-weight="bold" align="center">
          {{visit.qrCode}}
        </mj-text>
        <mj-text font-size="16px" color="#374151">
          We look forward to seeing you!
        </mj-text>
        <mj-text font-size="14px" color="#6b7280">
          Best regards,<br/>
          {{organization.name}}
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
  }

  private getCheckoutAlertEmailTemplate(): string {
    return `<mjml>
  <mj-head>
    <mj-title>Visitor Checked Out</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        <mj-text font-size="24px" color="#f59e0b" font-weight="bold" align="center">
          Visitor Checked Out
        </mj-text>
        <mj-divider border-color="#e5e7eb" />
        <mj-text font-size="16px" color="#374151">
          Hello {{host.firstName}},
        </mj-text>
        <mj-text font-size="16px" color="#374151">
          <strong>{{visitor.firstName}} {{visitor.lastName}}</strong> from <strong>{{visitor.company}}</strong> has checked out.
        </mj-text>
        <mj-section background-color="#fffbeb" padding="15px" border-radius="8px">
          <mj-column>
            <mj-text font-size="14px" color="#92400e" font-weight="bold">Visit Summary:</mj-text>
            <mj-text font-size="14px" color="#374151">
              • Check-in: {{visit.checkInTime}}<br/>
              • Check-out: {{visit.checkOutTime}}<br/>
              • Duration: {{visit.duration}}<br/>
              • Purpose: {{visit.purpose}}
            </mj-text>
          </mj-column>
        </mj-section>
        <mj-text font-size="16px" color="#374151">
          Thank you for hosting!
        </mj-text>
        <mj-text font-size="14px" color="#6b7280">
          Best regards,<br/>
          Visitor Management System
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
  }
}