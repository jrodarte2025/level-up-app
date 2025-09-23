/**
 * Phone number validation and formatting utilities
 */

/**
 * Format a phone number to (XXX) XXX-XXXX format
 * @param {string} phoneNumber - Raw phone number string
 * @returns {string} Formatted phone number or original if invalid
 */
export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';

  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Check if the number is valid US format (10 digits, optionally with 1 prefix)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    // Handle numbers with country code 1
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return original if not a valid format
  return phoneNumber;
}

/**
 * Validate if a phone number is in valid US format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {object} Validation result with isValid flag and optional error message
 */
export function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber || phoneNumber.trim() === '') {
    // Phone is optional, so empty is valid
    return { isValid: true };
  }

  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Valid US phone number: 10 digits, or 11 digits starting with 1
  if (cleaned.length === 10) {
    // Check for valid area code (first digit cannot be 0 or 1)
    if (cleaned[0] === '0' || cleaned[0] === '1') {
      return {
        isValid: false,
        error: 'Invalid area code. US area codes cannot start with 0 or 1.'
      };
    }
    // Check for valid exchange code (first digit cannot be 0 or 1)
    if (cleaned[3] === '0' || cleaned[3] === '1') {
      return {
        isValid: false,
        error: 'Invalid exchange code.'
      };
    }
    return { isValid: true };
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    // Check for valid area code (second digit cannot be 0 or 1)
    if (cleaned[1] === '0' || cleaned[1] === '1') {
      return {
        isValid: false,
        error: 'Invalid area code. US area codes cannot start with 0 or 1.'
      };
    }
    // Check for valid exchange code
    if (cleaned[4] === '0' || cleaned[4] === '1') {
      return {
        isValid: false,
        error: 'Invalid exchange code.'
      };
    }
    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'Please enter a valid 10-digit US phone number.'
  };
}

/**
 * Clean phone number for storage (removes formatting)
 * @param {string} phoneNumber - Formatted phone number
 * @returns {string} Cleaned phone number with only digits
 */
export function cleanPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  // Keep only digits
  return phoneNumber.replace(/\D/g, '');
}

/**
 * Normalize phone number for consistent storage
 * Always stores as 10 digits without country code
 * @param {string} phoneNumber - Phone number to normalize
 * @returns {string} Normalized phone number or original cleaned number
 */
export function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';

  const cleaned = cleanPhoneNumber(phoneNumber);

  // Remove country code 1 if present and we have 11 digits
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return cleaned.slice(1);
  }

  // Return the cleaned number (let validation happen separately)
  return cleaned;
}