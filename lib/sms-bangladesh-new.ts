// SMS Bangladesh API Utility
export interface SMSBangladeshConfig {
  baseUrl: string;
  user: string;
  password: string;
  from: string;
}

export interface SMSResponse {
  success: boolean;
  message: string;
  data?: any;
  failedNumbers?: string[];
}

/**
 * Send SMS via SMS Bangladesh API
 * API Format: https://panel.smsbangladesh.com/api?user=email&password=pass&from=mask&to=numbers&text=message
 */
export async function sendSMSBangladesh(
  config: SMSBangladeshConfig,
  numbers: string[],
  message: string
): Promise<SMSResponse> {
  try {
    // Format numbers for SMS Bangladesh API
    const formattedNumbers = numbers.map(num => {
      // Remove spaces and ensure proper format
      let formatted = num.replace(/\s/g, '');
      if (formatted.startsWith('0')) {
        formatted = '88' + formatted;
      } else if (!formatted.startsWith('88')) {
        formatted = '88' + formatted;
      }
      return formatted;
    });

    // Build query parameters for SMS Bangladesh API
    const params = new URLSearchParams({
      user: config.user,
      password: config.password,
      from: config.from,
      to: formattedNumbers.join(','),
      text: message
    });

    const response = await fetch(`${config.baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const result = await response.text();
    
    // SMS Bangladesh typically returns plain text response
    // Check if the response indicates success
    if (result.includes('success') || result.includes('Success') || response.ok) {
      return {
        success: true,
        message: 'SMS sent successfully',
        data: { 
          response: result, 
          recipients: formattedNumbers.length,
          formattedNumbers 
        }
      };
    } else {
      return {
        success: false,
        message: result || 'Failed to send SMS',
        data: { response: result }
      };
    }
  } catch (error) {
    console.error('SMS Bangladesh API Error:', error);
    return {
      success: false,
      message: 'API connection failed',
      failedNumbers: numbers
    };
  }
}

/**
 * Validate phone numbers for Bangladesh
 */
export function validateBangladeshPhoneNumbers(numbers: string[]): string[] {
  return numbers
    .map(num => num.trim())
    .filter(num => num.length > 0)
    .filter(num => /^[+]?[\d\s-]{10,15}$/.test(num));
}

/**
 * Format phone numbers for Bangladesh (add 88 country code)
 */
export function formatBangladeshPhoneNumbers(numbers: string[]): string[] {
  return numbers.map(num => {
    let formatted = num.replace(/\s/g, '');
    if (formatted.startsWith('0')) {
      formatted = '88' + formatted;
    } else if (!formatted.startsWith('88')) {
      formatted = '88' + formatted;
    }
    return formatted;
  });
}

/**
 * Parse recipients from text input (comma or newline separated)
 */
export function parseRecipients(recipientText: string): string[] {
  return recipientText
    .split(/[,\n]/)
    .map(num => num.trim())
    .filter(num => num.length > 0)
    .filter(num => /^[+]?[\d\s-]{10,15}$/.test(num));
}

/**
 * Validate SMS message for SMS Bangladesh
 */
export function validateSMSMessage(message: string): boolean {
  return message.length > 0 && message.length <= 1000; // SMS Bangladesh supports up to 1000 chars
}

/**
 * Get SMS Bangladesh configuration from environment variables
 */
export function getSMSBangladeshConfig(): SMSBangladeshConfig {
  return {
    baseUrl: 'https://panel.smsbangladesh.com/api',
    user: process.env.NEXT_PUBLIC_SMS_BANGLADESH_USER || '',
    password: process.env.NEXT_PUBLIC_SMS_BANGLADESH_PASSWORD || '',
    from: process.env.NEXT_PUBLIC_SMS_BANGLADESH_FROM || 'ECOMMERCE'
  };
}
