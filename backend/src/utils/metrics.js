const client = require('prom-client');
const { emailServiceProvider } = require('../settings/emailConfig');

const emailSendCounter = new client.Counter({
  name: 'email_send_total',
  help: 'Total number of email send attempts',
  labelNames: ['status', 'provider'], // 'success', 'failure', 'SendGrid', 'Mailgun'
});

const emailSendDuration = new client.Histogram({
  name: 'email_send_duration_seconds',
  help: 'Duration of email send operations in seconds',
  buckets: client.exponentialBuckets(0.001, 1.5, 10), // Гистограмма
  labelNames: ['provider'],
});

// Текущее состояние Circuit Breaker
const emailCircuitBreakerState = new client.Gauge({
  name: 'email_circuit_breaker_state',
  help: 'Current state of the email service circuit breaker (0=closed, 1=half-open, 2=open)',
  labelNames: ['provider'],
});

emailCircuitBreakerState.set({ provider: emailServiceProvider }, 0);

module.exports = {
  emailSendCounter,
  emailSendDuration,
  emailCircuitBreakerState,
  metricsHandler: async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  },
};