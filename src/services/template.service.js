/**
 * Replace {{variableName}} placeholders in text with actual values.
 * Missing variables are replaced with empty strings.
 *
 * @param {string} text - Template text containing {{var}} placeholders
 * @param {object} variables - Key-value pairs for substitution
 * @returns {string} - Processed text
 */
const replaceTemplateVariables = (text, variables = {}) => {
  if (!text) return '';

  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? String(variables[varName]) : '';
  });
};

/**
 * Get available template variables and their descriptions.
 * Useful for frontend to show available placeholders.
 */
const getAvailableVariables = () => {
  return [
    { key: 'participantName', description: 'Recipient\'s full name' },
    { key: 'participantEmail', description: 'Recipient\'s email address' },
    { key: 'eventTitle', description: 'Name of the event' },
    { key: 'eventDate', description: 'Date of the event' },
    { key: 'eventVenue', description: 'Venue of the event' },
    { key: 'senderName', description: 'Name of the faculty sending the mail' },
  ];
};

export { replaceTemplateVariables, getAvailableVariables };
