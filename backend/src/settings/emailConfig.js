require('dotenv').config();

module.exports = {
  emailServiceProvider: process.env.EMAIL_SERVICE_PROVIDER || 'SendGrid',
  sendGridApiKey: process.env.SENDGRID_API_KEY,
  mailgunApiKey: process.env.MAILGUN_API_KEY,
  mailgunDomain: process.env.MAILGUN_DOMAIN,
  postmarkApiToken: process.env.POSTMARK_API_TOKEN,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION,

  emailFromAddress: process.env.EMAIL_FROM_ADDRESS || 'no-reply@idurar.com',

  emailServiceTimeout: parseInt(process.env.EMAIL_SERVICE_TIMEOUT_MS || '5000', 10),
  emailRetryAttempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3', 10),
  emailRetryMinTimeout: parseInt(process.env.EMAIL_RETRY_MIN_TIMEOUT_MS || '1000', 10),

  emailCbErrorThreshold: parseInt(process.env.EMAIL_CB_ERROR_THRESHOLD || '50', 10),
  emailCbResetTimeout: parseInt(process.env.EMAIL_CB_RESET_TIMEOUT_MS || '30000', 10),
};