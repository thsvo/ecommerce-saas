import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

interface WhatsAppWebhookMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`WhatsApp Webhook - ${req.method} request received`);
  console.log('Headers:', req.headers);
  console.log('Query:', req.query);
  console.log('Body:', req.body);

  // Handle GET request for webhook verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Webhook verification request:', { mode, token, challenge });

    // Check if the mode and token are correct
    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      // Respond with the challenge to verify the webhook
      return res.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed:', {
        expectedToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
        receivedToken: token
      });
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  // Handle POST request for webhook events
  if (req.method === 'POST') {
    try {
      // Verify the webhook signature (optional but recommended for production)
      const signature = req.headers['x-hub-signature-256'] as string;
      if (signature && process.env.WHATSAPP_WEBHOOK_SECRET) {
        const expectedSignature = crypto
          .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET)
          .update(JSON.stringify(req.body))
          .digest('hex');
        
        if (`sha256=${expectedSignature}` !== signature) {
          console.log('Invalid webhook signature');
          return res.status(401).json({ message: 'Invalid signature' });
        }
      }

      const webhookData: WhatsAppWebhookMessage = req.body;

      // Process the webhook data
      if (webhookData.object === 'whatsapp_business_account') {
        for (const entry of webhookData.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              // Handle incoming messages
              if (change.value.messages) {
                for (const message of change.value.messages) {
                  console.log('Received message:', {
                    from: message.from,
                    text: message.text?.body,
                    timestamp: message.timestamp
                  });

                  // Here you can add your business logic to handle incoming messages
                  // For example:
                  // - Save to database
                  // - Send auto-reply
                  // - Process customer service requests
                  // - Handle order inquiries
                  
                  await handleIncomingMessage(message, change.value.metadata);
                }
              }

              // Handle message status updates (delivered, read, etc.)
              if (change.value.statuses) {
                for (const status of change.value.statuses) {
                  console.log('Message status update:', {
                    messageId: status.id,
                    status: status.status,
                    timestamp: status.timestamp
                  });

                  await handleMessageStatus(status);
                }
              }
            }
          }
        }
      }

      // Always respond with 200 to acknowledge receipt
      return res.status(200).json({ message: 'Webhook received' });

    } catch (error) {
      console.error('Error processing webhook:', error);
      // Still return 200 to avoid WhatsApp retrying
      return res.status(200).json({ message: 'Error processed' });
    }
  }

  // Method not allowed
  return res.status(405).json({ message: 'Method not allowed' });
}

// Handle incoming messages
async function handleIncomingMessage(
  message: any,
  metadata: { display_phone_number: string; phone_number_id: string }
) {
  try {
    console.log('Processing incoming message:', message);

    // Example: Save message to database
    // await prisma.whatsAppMessage.create({
    //   data: {
    //     messageId: message.id,
    //     from: message.from,
    //     text: message.text?.body,
    //     timestamp: new Date(parseInt(message.timestamp) * 1000),
    //     phoneNumberId: metadata.phone_number_id,
    //   }
    // });

    // Example: Send auto-reply for specific keywords
    if (message.text?.body.toLowerCase().includes('help')) {
      // You can implement auto-reply logic here
      console.log('Auto-reply trigger detected for help request');
    }

    if (message.text?.body.toLowerCase().includes('order')) {
      // Handle order-related inquiries
      console.log('Order inquiry detected');
    }

  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

// Handle message status updates
async function handleMessageStatus(status: any) {
  try {
    console.log('Processing message status:', status);

    // Example: Update message status in database
    // await prisma.whatsAppMessage.updateMany({
    //   where: { messageId: status.id },
    //   data: { 
    //     status: status.status,
    //     statusTimestamp: new Date(parseInt(status.timestamp) * 1000)
    //   }
    // });

  } catch (error) {
    console.error('Error handling message status:', error);
  }
}