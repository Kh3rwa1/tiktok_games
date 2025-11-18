/**
 * Unified Notification Service
 * Manages AWS SNS, AWS SES, and Firebase Cloud Messaging (FCM)
 * Control all notification channels from a single interface
 */

const admin = require('firebase-admin');

// AWS SDK v3 imports
let SNSClient, SESClient, PublishCommand, SendEmailCommand;
try {
  const sns = require('@aws-sdk/client-sns');
  const ses = require('@aws-sdk/client-ses');
  SNSClient = sns.SNSClient;
  PublishCommand = sns.PublishCommand;
  SESClient = ses.SESClient;
  SendEmailCommand = ses.SendEmailCommand;
} catch (error) {
  console.log('AWS SDK v3 not installed, using v2 fallback');
}

// Fallback to AWS SDK v2
let AWS;
try {
  AWS = require('aws-sdk');
} catch (error) {
  console.log('AWS SDK v2 not available');
}

class NotificationService {
  constructor() {
    this.config = {
      // Master toggle
      enabled: true,

      // AWS SNS Configuration
      aws: {
        enabled: false,
        sns: {
          enabled: false,
          topicArn: process.env.AWS_SNS_TOPIC_ARN || '',
          region: process.env.AWS_REGION || 'us-east-1',
        },
        ses: {
          enabled: false,
          fromEmail: process.env.AWS_SES_FROM_EMAIL || 'noreply@yourdomain.com',
          region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1',
        }
      },

      // Firebase FCM Configuration
      firebase: {
        enabled: false,
        fcm: {
          enabled: false,
        }
      },

      // Notification preferences
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        // Notification types
        newUserAlerts: true,
        gameUploadAlerts: true,
        systemAlerts: true,
        marketingNotifications: false,
      }
    };

    this.snsClient = null;
    this.sesClient = null;
    this.initialized = false;
  }

  /**
   * Initialize notification services
   */
  async initialize() {
    try {
      // Initialize AWS clients
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        const awsConfig = {
          region: this.config.aws.sns.region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        };

        if (SNSClient) {
          // AWS SDK v3
          this.snsClient = new SNSClient(awsConfig);
          this.sesClient = new SESClient({
            ...awsConfig,
            region: this.config.aws.ses.region
          });
        } else if (AWS) {
          // AWS SDK v2 fallback
          AWS.config.update({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: this.config.aws.sns.region
          });
          this.snsClient = new AWS.SNS();
          this.sesClient = new AWS.SES({ region: this.config.aws.ses.region });
        }

        this.config.aws.enabled = true;
        this.config.aws.sns.enabled = true;
        this.config.aws.ses.enabled = true;
        console.log('AWS notification services initialized');
      }

      // Check Firebase FCM availability
      if (admin.apps.length > 0) {
        this.config.firebase.enabled = true;
        this.config.firebase.fcm.enabled = true;
        console.log('Firebase FCM initialized');
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing notification services:', error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      ...this.config,
      status: {
        initialized: this.initialized,
        awsAvailable: !!this.snsClient,
        firebaseAvailable: admin.apps.length > 0,
      }
    };
  }

  /**
   * Send notification through all enabled channels
   */
  async sendNotification({ title, body, data = {}, targets = {}, type = 'general' }) {
    if (!this.config.enabled) {
      return { success: false, message: 'Notifications are disabled' };
    }

    const results = {
      success: true,
      channels: {},
      errors: []
    };

    // Check notification type preferences
    const typeMap = {
      'new_user': 'newUserAlerts',
      'game_upload': 'gameUploadAlerts',
      'system': 'systemAlerts',
      'marketing': 'marketingNotifications',
    };

    if (typeMap[type] && !this.config.preferences[typeMap[type]]) {
      return { success: false, message: `Notification type '${type}' is disabled` };
    }

    try {
      // Send FCM push notification
      if (this.config.firebase.fcm.enabled && this.config.preferences.pushNotifications) {
        if (targets.fcmTokens && targets.fcmTokens.length > 0) {
          const fcmResult = await this.sendFCM(title, body, data, targets.fcmTokens);
          results.channels.fcm = fcmResult;
        } else if (targets.topic) {
          const fcmResult = await this.sendFCMToTopic(title, body, data, targets.topic);
          results.channels.fcm = fcmResult;
        }
      }

      // Send AWS SNS
      if (this.config.aws.sns.enabled && this.config.preferences.pushNotifications) {
        if (targets.snsEndpoints && targets.snsEndpoints.length > 0) {
          for (const endpoint of targets.snsEndpoints) {
            const snsResult = await this.sendSNS(title, body, endpoint);
            results.channels.sns = snsResult;
          }
        } else if (this.config.aws.sns.topicArn) {
          const snsResult = await this.sendSNSToTopic(title, body);
          results.channels.sns = snsResult;
        }
      }

      // Send AWS SES email
      if (this.config.aws.ses.enabled && this.config.preferences.emailNotifications) {
        if (targets.emails && targets.emails.length > 0) {
          const emailResult = await this.sendEmail(targets.emails, title, body);
          results.channels.ses = emailResult;
        }
      }

    } catch (error) {
      results.success = false;
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Send Firebase Cloud Messaging notification
   */
  async sendFCM(title, body, data, tokens) {
    if (!this.config.firebase.fcm.enabled || admin.apps.length === 0) {
      return { success: false, message: 'FCM not enabled or initialized' };
    }

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        tokens: Array.isArray(tokens) ? tokens : [tokens],
      };

      const response = await admin.messaging().sendMulticast(message);

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } catch (error) {
      console.error('FCM send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send FCM to topic
   */
  async sendFCMToTopic(title, body, data, topic) {
    if (!this.config.firebase.fcm.enabled || admin.apps.length === 0) {
      return { success: false, message: 'FCM not enabled or initialized' };
    }

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        topic,
      };

      const response = await admin.messaging().send(message);

      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      console.error('FCM topic send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send AWS SNS notification
   */
  async sendSNS(title, body, targetArn) {
    if (!this.config.aws.sns.enabled || !this.snsClient) {
      return { success: false, message: 'SNS not enabled or initialized' };
    }

    try {
      const params = {
        Message: JSON.stringify({
          default: body,
          GCM: JSON.stringify({
            notification: { title, body }
          }),
          APNS: JSON.stringify({
            aps: { alert: { title, body } }
          })
        }),
        MessageStructure: 'json',
        TargetArn: targetArn,
        Subject: title,
      };

      let result;
      if (PublishCommand) {
        // AWS SDK v3
        result = await this.snsClient.send(new PublishCommand(params));
      } else {
        // AWS SDK v2
        result = await this.snsClient.publish(params).promise();
      }

      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('SNS send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SNS to topic
   */
  async sendSNSToTopic(title, body) {
    if (!this.config.aws.sns.enabled || !this.snsClient || !this.config.aws.sns.topicArn) {
      return { success: false, message: 'SNS topic not configured' };
    }

    try {
      const params = {
        Message: body,
        Subject: title,
        TopicArn: this.config.aws.sns.topicArn,
      };

      let result;
      if (PublishCommand) {
        result = await this.snsClient.send(new PublishCommand(params));
      } else {
        result = await this.snsClient.publish(params).promise();
      }

      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('SNS topic send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email via AWS SES
   */
  async sendEmail(recipients, subject, body) {
    if (!this.config.aws.ses.enabled || !this.sesClient) {
      return { success: false, message: 'SES not enabled or initialized' };
    }

    try {
      const params = {
        Destination: {
          ToAddresses: Array.isArray(recipients) ? recipients : [recipients],
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: this.formatEmailBody(subject, body),
            },
            Text: {
              Charset: 'UTF-8',
              Data: body,
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: subject,
          },
        },
        Source: this.config.aws.ses.fromEmail,
      };

      let result;
      if (SendEmailCommand) {
        // AWS SDK v3
        result = await this.sesClient.send(new SendEmailCommand(params));
      } else {
        // AWS SDK v2
        result = await this.sesClient.sendEmail(params).promise();
      }

      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('SES send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format email body with HTML template
   */
  formatEmailBody(subject, content) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TikTok Games</h1>
          </div>
          <div class="content">
            <h2>${subject}</h2>
            <p>${content}</p>
          </div>
          <div class="footer">
            <p>This email was sent from TikTok Games Admin Panel</p>
            <p>Do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Subscribe user to FCM topic
   */
  async subscribeToTopic(tokens, topic) {
    if (!this.config.firebase.fcm.enabled || admin.apps.length === 0) {
      return { success: false, message: 'FCM not enabled' };
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe user from FCM topic
   */
  async unsubscribeFromTopic(tokens, topic) {
    if (!this.config.firebase.fcm.enabled || admin.apps.length === 0) {
      return { success: false, message: 'FCM not enabled' };
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification({ title, body, data = {}, userIds = [], type = 'general' }) {
    // This would fetch FCM tokens from database for given user IDs
    // Implementation depends on your user data structure
    const results = {
      total: userIds.length,
      success: 0,
      failed: 0,
      errors: []
    };

    // For now, send to topic 'all' as a demonstration
    if (userIds.length === 0) {
      return await this.sendNotification({
        title,
        body,
        data,
        targets: { topic: 'all' },
        type
      });
    }

    return results;
  }

  /**
   * Test notification services
   */
  async testNotifications(email = null) {
    const results = {
      fcm: { available: false, tested: false },
      sns: { available: false, tested: false },
      ses: { available: false, tested: false },
    };

    // Test FCM
    if (this.config.firebase.fcm.enabled) {
      results.fcm.available = true;
      // FCM needs device tokens to test
    }

    // Test SNS
    if (this.config.aws.sns.enabled && this.snsClient) {
      results.sns.available = true;
      // SNS needs endpoint or topic
    }

    // Test SES
    if (this.config.aws.ses.enabled && this.sesClient && email) {
      results.ses.available = true;
      try {
        await this.sendEmail(email, 'Test Notification', 'This is a test email from TikTok Games Admin Panel');
        results.ses.tested = true;
      } catch (error) {
        results.ses.error = error.message;
      }
    }

    return results;
  }
}

// Export singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;
