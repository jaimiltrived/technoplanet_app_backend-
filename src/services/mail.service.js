import nodemailer from 'nodemailer';

/**
 * Create reusable SMTP transporter
 * Falls back from SMTP_* vars to existing MAIL_NAME/MAIL_PASSWORD vars
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.MAIL_NAME;
  const pass = process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error('SMTP credentials not configured. Set SMTP_USER/SMTP_PASSWORD or MAIL_NAME/MAIL_PASSWORD in .env');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

let transporter = null;

/**
 * Get or create the singleton transporter
 */
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Send a single email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML body content
 * @returns {Promise<object>} - Nodemailer send result
 */
const sendMail = async (to, subject, html) => {
  const transport = getTransporter();
  const fromName = process.env.MAIL_FROM_NAME || 'RKU Technoplanet';
  const fromEmail = process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_NAME;

  return transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
};

/**
 * Send emails in batches with concurrency control
 * @param {Array<{email: string, name: string}>} recipients
 * @param {string} subject
 * @param {string} bodyTemplate - HTML body with {{varName}} placeholders
 * @param {Function} variableResolver - (recipient) => { varName: value }
 * @param {number} concurrency - Max concurrent sends
 * @returns {Promise<{sentCount: number, failedCount: number, errors: Array}>}
 */
const sendBulkMail = async (recipients, subject, bodyTemplate, variableResolver, concurrency = 5) => {
  let sentCount = 0;
  let failedCount = 0;
  const errors = [];

  // Process in batches
  for (let i = 0; i < recipients.length; i += concurrency) {
    const batch = recipients.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        const variables = variableResolver(recipient);
        let personalizedBody = bodyTemplate;
        let personalizedSubject = subject;

        // Replace template variables
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          personalizedBody = personalizedBody.replace(regex, value || '');
          personalizedSubject = personalizedSubject.replace(regex, value || '');
        }

        return sendMail(recipient.email, personalizedSubject, personalizedBody);
      })
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        sentCount++;
      } else {
        failedCount++;
        errors.push({
          email: batch[index].email,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });
  }

  return { sentCount, failedCount, errors };
};

/**
 * Verify SMTP connection
 */
const verifySmtpConnection = async () => {
  try {
    const transport = getTransporter();
    await transport.verify();
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

export { sendMail, sendBulkMail, verifySmtpConnection };
