const {
  emailServiceProvider,
  sendGridApiKey,
  mailgunApiKey,
  mailgunDomain,
  emailFromAddress,
  emailServiceTimeout,
  emailRetryAttempts,
  emailRetryMinTimeout,
  emailCbErrorThreshold,
  emailCbResetTimeout,
} = require('../settings/emailConfig');

const logger = require('../utils/logger');
const {
  emailSendCounter,
  emailSendDuration,
  emailCircuitBreakerState,
} = require('../utils/metrics');

const retry = require('async-retry');
const circuitBreaker = require('opossum');

let mailer;

switch (emailServiceProvider) {
  case 'SendGrid':
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(sendGridApiKey);
    mailer = {
      send: async (msg) => {
        await sgMail.send(msg);
      },
    };
    logger.info('Email service provider set to SendGrid.');
    break;
  case 'Mailgun':
    const formData = require('form-data');
    const Mailgun = require('mailgun.js');
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({ username: 'api', key: mailgunApiKey });
    mailer = {
      send: async (msg) => {
        await mg.messages.create(mailgunDomain, {
          from: msg.from,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        });
      },
    };
    logger.info('Email service provider set to Mailgun.');
    break;

  default:
    logger.error('Unsupported email service provider specified in .env. Please check EMAIL_SERVICE_PROVIDER.');
    throw new Error('Unsupported email service provider. Check EMAIL_SERVICE_PROVIDER in .env');
}

async function doSendEmail(msg) {
  if (!mailer) {
      throw new Error('Email mailer not initialized.');
  }

  await mailer.send(msg);
}

const breakerOptions = {
  timeout: emailServiceTimeout,
  errorThresholdPercentage: emailCbErrorThreshold,
  resetTimeout: emailCbResetTimeout,
};

const breaker = new circuitBreaker(doSendEmail, breakerOptions); // <--- Добавлено 'new'

breaker.on('open', () => {
  logger.warn('Email service circuit breaker opened!');
  emailCircuitBreakerState.set({ provider: emailServiceProvider }, 2); // 2 = open
});
breaker.on('halfOpen', () => {
  logger.warn('Email service circuit breaker half-open. Trying again...');
  emailCircuitBreakerState.set({ provider: emailServiceProvider }, 1); // 1 = half-open
});
breaker.on('close', () => {
  logger.info('Email service circuit breaker closed.');
  emailCircuitBreakerState.set({ provider: emailServiceProvider }, 0); // 0 = closed
});
breaker.on('fallback', (error) => {
  logger.error('Email service fallback activated: Could not send email via primary service.', {
    error: error.message,
    provider: emailServiceProvider,
  });
});

const sendEmail = async (to, subject, htmlContent, textContent, attachments = []) => {
  const msg = {
    to,
    from: emailFromAddress,
    subject,
    html: htmlContent,
    text: textContent,
  };

  const endTimer = emailSendDuration.startTimer({ provider: emailServiceProvider });

  try {
    await retry(async bail => {
      await breaker.fire(msg);
    }, {
      retries: emailRetryAttempts,
      factor: 2,
      minTimeout: emailRetryMinTimeout,
      onRetry: (error, attempt) => {
        logger.warn(`Attempt ${attempt} failed to send email via ${emailServiceProvider}. Retrying...`, {
          error: error.message,
          to: msg.to,
          subject: msg.subject,
          attempt: attempt,
          provider: emailServiceProvider,
        });
      }
    });

    endTimer();
    emailSendCounter.inc({ status: 'success', provider: emailServiceProvider });
    logger.info('Email sent successfully', { to: msg.to, subject: msg.subject, provider: emailServiceProvider });
    return { success: true, message: 'Email sent' };
  } catch (error) {
    endTimer();
    emailSendCounter.inc({ status: 'failure', provider: emailServiceProvider });
    logger.error('Fatal error sending email after retries and circuit breaker. Email was not delivered.', {
      error: error.message,
      stack: error.stack,
      to: msg.to,
      subject: msg.subject,
      provider: emailServiceProvider,
    });
    throw error;
  }
};

module.exports = { sendEmail };