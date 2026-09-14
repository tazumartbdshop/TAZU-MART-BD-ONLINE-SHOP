import bcrypt from 'bcryptjs';

/**
 * Hash a plain text password using bcryptjs.
 */
export function hashPassword(plainText: string): string {
  if (!plainText) return '';
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

/**
 * Verify whether a plain text password matches a stored hash or legacy plain string.
 */
export function verifyPassword(plainText: string, hashOrPlain: string): boolean {
  if (!plainText || !hashOrPlain) return false;
  
  // Check if target is a standard bcrypt hash
  const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hashOrPlain);
  if (isBcrypt) {
    try {
      return bcrypt.compareSync(plainText, hashOrPlain);
    } catch {
      return false;
    }
  }

  // Backward compatibility fallback for legacy plain text passwords in demo/seed data
  return plainText === hashOrPlain;
}

/**
 * Helper to check if a password string is already a bcrypt hash.
 */
export function isBcryptHash(val: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(val);
}
