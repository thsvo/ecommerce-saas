interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  apiVersion: string;
}

interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: {
    body: string;
  };
}

interface WhatsAppTemplateMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
        image?: { link: string };
        video?: { link: string };
        document?: { link: string; filename: string };
      }>;
    }>;
  };
}

interface WhatsAppMediaMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'image' | 'video' | 'audio' | 'document';
  image?: { link: string; caption?: string };
  video?: { link: string; caption?: string };
  audio?: { link: string };
  document?: { link: string; caption?: string; filename?: string };
}

interface WhatsAppResponse {
  messages: Array<{
    id: string;
  }>;
  meta: {
    version: string;
    api_status: string;
  };
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
}

interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    error_data?: {
      messaging_product: string;
      details: string;
    };
  };
}

export class WhatsAppBusinessAPI {
  private config: WhatsAppConfig;
  private baseUrl: string;

  constructor(config: WhatsAppConfig) {
    this.config = config;
    this.baseUrl = `https://graph.facebook.com/${config.apiVersion}`;
  }

  /**
   * Validate phone number format (should include country code)
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    // Remove any spaces, dashes, or parentheses
    const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Check if it starts with + and has at least 10 digits
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    return phoneRegex.test(cleanNumber);
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    let formatted = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Add + if not present
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    
    // Remove + for API call (Meta API expects number without +)
    return formatted.substring(1);
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    if (!this.validatePhoneNumber(to)) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    const formattedNumber = this.formatPhoneNumber(to);
    
    const payload: WhatsAppTextMessage = {
      messaging_product: 'whatsapp',
      to: formattedNumber,
      type: 'text',
      text: {
        body: message
      }
    };

    return this.makeAPICall('/messages', payload);
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    languageCode: string = 'en',
    components?: any[]
  ): Promise<WhatsAppResponse> {
    if (!this.validatePhoneNumber(to)) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    const formattedNumber = this.formatPhoneNumber(to);
    
    const payload: WhatsAppTemplateMessage = {
      messaging_product: 'whatsapp',
      to: formattedNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        }
      }
    };

    if (components && components.length > 0) {
      payload.template.components = components;
    }

    return this.makeAPICall('/messages', payload);
  }

  /**
   * Send a media message (image, video, audio, document)
   */
  async sendMediaMessage(
    to: string, 
    mediaType: 'image' | 'video' | 'audio' | 'document',
    mediaUrl: string,
    caption?: string,
    filename?: string
  ): Promise<WhatsAppResponse> {
    if (!this.validatePhoneNumber(to)) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    const formattedNumber = this.formatPhoneNumber(to);
    
    const payload: WhatsAppMediaMessage = {
      messaging_product: 'whatsapp',
      to: formattedNumber,
      type: mediaType
    };

    switch (mediaType) {
      case 'image':
        payload.image = { link: mediaUrl };
        if (caption) payload.image.caption = caption;
        break;
      case 'video':
        payload.video = { link: mediaUrl };
        if (caption) payload.video.caption = caption;
        break;
      case 'audio':
        payload.audio = { link: mediaUrl };
        break;
      case 'document':
        payload.document = { link: mediaUrl };
        if (caption) payload.document.caption = caption;
        if (filename) payload.document.filename = filename;
        break;
    }

    return this.makeAPICall('/messages', payload);
  }

  /**
   * Get message templates
   */
  async getMessageTemplates(): Promise<any> {
    const url = `/${this.config.businessAccountId}/message_templates`;
    return this.makeAPICall(url, null, 'GET');
  }

  /**
   * Create a message template
   */
  async createMessageTemplate(templateData: any): Promise<any> {
    const url = `/${this.config.businessAccountId}/message_templates`;
    return this.makeAPICall(url, templateData);
  }

  /**
   * Get phone number information
   */
  async getPhoneNumberInfo(): Promise<any> {
    const url = `/${this.config.phoneNumberId}`;
    return this.makeAPICall(url, null, 'GET');
  }

  /**
   * Make API call to WhatsApp Business API
   */
  private async makeAPICall(
    endpoint: string, 
    payload: any = null, 
    method: 'GET' | 'POST' = 'POST'
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${this.config.phoneNumberId}${endpoint}`}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (payload && method === 'POST') {
      options.body = JSON.stringify(payload);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        const error = data as WhatsAppError;
        throw new Error(`WhatsApp API Error: ${error.error.message} (Code: ${error.error.code})`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while calling WhatsApp API');
    }
  }

  /**
   * Bulk send messages to multiple recipients
   */
  async sendBulkMessages(
    recipients: string[],
    messageType: 'text' | 'template' | 'media',
    messageData: any,
    delayBetweenMessages: number = 1000 // 1 second delay by default
  ): Promise<{
    successful: Array<{ phoneNumber: string; messageId: string }>;
    failed: Array<{ phoneNumber: string; error: string }>;
  }> {
    const successful: Array<{ phoneNumber: string; messageId: string }> = [];
    const failed: Array<{ phoneNumber: string; error: string }> = [];

    for (let i = 0; i < recipients.length; i++) {
      const phoneNumber = recipients[i];
      
      try {
        let response: WhatsAppResponse;
        
        switch (messageType) {
          case 'text':
            response = await this.sendTextMessage(phoneNumber, messageData.message);
            break;
          case 'template':
            response = await this.sendTemplateMessage(
              phoneNumber,
              messageData.templateName,
              messageData.languageCode,
              messageData.components
            );
            break;
          case 'media':
            response = await this.sendMediaMessage(
              phoneNumber,
              messageData.mediaType,
              messageData.mediaUrl,
              messageData.caption,
              messageData.filename
            );
            break;
          default:
            throw new Error(`Unsupported message type: ${messageType}`);
        }

        successful.push({
          phoneNumber,
          messageId: response.messages[0].id
        });

      } catch (error) {
        failed.push({
          phoneNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Add delay between messages to avoid rate limiting
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
      }
    }

    return { successful, failed };
  }
}

/**
 * Utility function to parse recipients from text input
 */
export function parseWhatsAppRecipients(recipientsText: string): string[] {
  return recipientsText
    .split(/[,\n\r]/)
    .map(phone => phone.trim())
    .filter(phone => phone.length > 0)
    .filter(phone => {
      const api = new WhatsAppBusinessAPI({
        accessToken: '',
        phoneNumberId: '',
        businessAccountId: '',
        webhookVerifyToken: '',
        apiVersion: 'v23.0'
      });
      return (api as any).validatePhoneNumber(phone);
    });
}

/**
 * Validate WhatsApp message content
 */
export function validateWhatsAppMessage(message: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!message || message.trim().length === 0) {
    errors.push('Message cannot be empty');
  }

  if (message.length > 4096) {
    errors.push('Message cannot exceed 4096 characters');
  }

  // Check for prohibited content patterns
  const prohibitedPatterns = [
    /\b(click here|tap here)\b/i,
    /\b(limited time|act now|urgent)\b/i,
  ];

  prohibitedPatterns.forEach(pattern => {
    if (pattern.test(message)) {
      errors.push('Message contains potentially prohibited promotional language');
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default WhatsAppBusinessAPI;
