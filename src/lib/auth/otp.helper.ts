import crypto from "crypto";
import env from "@/config/env";

/**
 * Derives a 32-byte encryption key from AUTH_SECRET.
 * Memoized in process memory.
 */
let cachedKey: Buffer | null = null;
function getDerivedKey(): Buffer {
  if (!cachedKey) {
    cachedKey = crypto.scryptSync(env.AUTH_SECRET, "advocate-chamber-otp-salt-v1", 32);
  }
  return cachedKey;
}

/**
 * Generates a cryptographically random 6-digit numeric OTP.
 */
export function generateOtp(): string {
  // Generates integer in range [100000, 999999] inclusive
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Generates a random cryptographic salt.
 */
export function generateSalt(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Computes a keyed HMAC-SHA256 verifier for an OTP using AUTH_SECRET and salt.
 * Ensures the database never contains raw OTPs and brute-force lookup across
 * short numeric space without the server secret is impossible.
 */
export function hashOtp(otp: string, salt: string): string {
  return crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(`${otp.trim()}:${salt}`)
    .digest("hex");
}

/**
 * Constant-time comparison of an OTP candidate against the stored HMAC verifier.
 */
export function verifyOtpHash(otp: string, salt: string, storedHash: string): boolean {
  if (!otp || !salt || !storedHash) return false;
  const computedHash = hashOtp(otp, salt);

  const storedBuffer = Buffer.from(storedHash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, computedBuffer);
}

/**
 * Generates a high-entropy 256-bit reset authorization token (64 hex characters).
 */
export function generateResetAuthToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes HMAC-SHA256 for a reset authorization token.
 */
export function hashResetAuthToken(token: string): string {
  return crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(token.trim())
    .digest("hex");
}

/**
 * Constant-time verification of a reset authorization token.
 */
export function verifyResetAuthToken(token: string, storedHash: string): boolean {
  if (!token || !storedHash) return false;
  const computedHash = hashResetAuthToken(token);

  const storedBuffer = Buffer.from(storedHash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, computedBuffer);
}

/**
 * Encrypts sensitive transient data (e.g. OTP for Inngest event payload) using AES-256-GCM.
 * This guarantees the OTP is never exposed in plaintext in Inngest event payloads or logs.
 */
export function encryptPayload(plaintext: string): {
  ciphertext: string;
  iv: string;
  tag: string;
} {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

/**
 * Decrypts data encrypted by encryptPayload using AES-256-GCM.
 */
export function decryptPayload(ciphertext: string, iv: string, tag: string): string {
  const key = getDerivedKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
