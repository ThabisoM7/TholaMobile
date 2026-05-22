/**
 * Validates a South African mobile phone number.
 * Accepts formats: 0721234567, +27721234567, 27721234567
 */
export const isValidSAMobileNumber = (phone: string): boolean => {
  // ^              : Start of string
  // (?:\+27|27|0)  : Non-capturing group matching +27, 27, or 0
  // [678]          : Next digit must be 6, 7, or 8 (SA mobile networks)
  // \d{8}          : Exactly 8 remaining digits
  // $              : End of string
  const saMobileRegex = /^(?:\+27|27|0)[678]\d{8}$/;
  
  // Strip whitespace and test
  return saMobileRegex.test(phone.replace(/\s+/g, ''));
};
