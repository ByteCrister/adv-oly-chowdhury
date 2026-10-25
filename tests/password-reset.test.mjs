import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { z } from "zod";

// ---------------------------------------------------------------------------
// 1. Environment Validation Tests
// ---------------------------------------------------------------------------
test("Environment Schema validates SMTP and Inngest variables", () => {
  const envSchema = z.object({
    SMTP_USER: z.string().min(1),
    SMTP_PASSWORD: z.string().min(1),
    SMTP_HOST: z.string().default("smtp.gmail.com"),
    SMTP_PORT: z.coerce.number().default(465),
    SMTP_SECURE: z.coerce.boolean().default(true),
    INNGEST_SIGNING_KEY: z.string().min(1),
    INNGEST_EVENT_KEY: z.string().min(1),
  });

  const valid = envSchema.safeParse({
    SMTP_USER: "advocate@gmail.com",
    SMTP_PASSWORD: "app-password-1234",
    INNGEST_SIGNING_KEY: "signkey_123",
    INNGEST_EVENT_KEY: "eventkey_123",
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.SMTP_HOST, "smtp.gmail.com");
    assert.equal(valid.data.SMTP_PORT, 465);
    assert.equal(valid.data.SMTP_SECURE, true);
  }

  const missingSmtp = envSchema.safeParse({
    SMTP_USER: "",
    SMTP_PASSWORD: "pwd",
    INNGEST_SIGNING_KEY: "key",
    INNGEST_EVENT_KEY: "key",
  });
  assert.equal(missingSmtp.success, false);

  const missingInngest = envSchema.safeParse({
    SMTP_USER: "user@test.com",
    SMTP_PASSWORD: "pwd",
    INNGEST_SIGNING_KEY: "",
    INNGEST_EVENT_KEY: "key",
  });
  assert.equal(missingInngest.success, false);
});

// ---------------------------------------------------------------------------
// 2. Cryptographic Security Helpers Tests
// ---------------------------------------------------------------------------
const TEST_SECRET = "test-secret-must-be-at-least-32-bytes-long-for-auth";

function hashOtp(otp, salt, secret = TEST_SECRET) {
  return crypto.createHmac("sha256", secret).update(`${otp.trim()}:${salt}`).digest("hex");
}

function verifyOtpHash(otp, salt, storedHash, secret = TEST_SECRET) {
  if (!otp || !salt || !storedHash) return false;
  const computedHash = hashOtp(otp, salt, secret);
  const storedBuffer = Buffer.from(storedHash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");
  if (storedBuffer.length !== computedBuffer.length) return false;
  return crypto.timingSafeEqual(storedBuffer, computedBuffer);
}

function encryptPayload(plaintext, secret = TEST_SECRET) {
  const key = crypto.scryptSync(secret, "advocate-chamber-otp-salt-v1", 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

function decryptPayload(ciphertext, iv, tag, secret = TEST_SECRET) {
  const key = crypto.scryptSync(secret, "advocate-chamber-otp-salt-v1", 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

test("OTP generation produces a valid 6-digit numeric string", () => {
  for (let i = 0; i < 50; i++) {
    const otp = crypto.randomInt(100000, 1000000).toString();
    assert.equal(otp.length, 6);
    assert.match(otp, /^\d{6}$/);
    const num = parseInt(otp, 10);
    assert.ok(num >= 100000 && num <= 999999);
  }
});

test("HMAC-SHA256 OTP verification performs constant-time checks", () => {
  const otp = "849201";
  const salt = crypto.randomBytes(16).toString("hex");
  const storedHash = hashOtp(otp, salt);

  // Correct OTP
  assert.equal(verifyOtpHash(otp, salt, storedHash), true);

  // Incorrect OTP
  assert.equal(verifyOtpHash("849202", salt, storedHash), false);
  assert.equal(verifyOtpHash("000000", salt, storedHash), false);

  // Empty or invalid input
  assert.equal(verifyOtpHash("", salt, storedHash), false);
  assert.equal(verifyOtpHash(otp, "", storedHash), false);
  assert.equal(verifyOtpHash(otp, salt, ""), false);
});

test("AES-256-GCM transient payload encryption & decryption works securely", () => {
  const secretOtp = "482015";
  const { ciphertext, iv, tag } = encryptPayload(secretOtp);

  // Ciphertext must not match raw OTP
  assert.notEqual(ciphertext, secretOtp);
  assert.ok(ciphertext.length > 0);

  // Decryption recovers exact OTP
  const recovered = decryptPayload(ciphertext, iv, tag);
  assert.equal(recovered, secretOtp);

  // Tampered ciphertext fails authentication
  const tamperedCiphertext = "aa" + ciphertext.slice(2);
  assert.throws(() => decryptPayload(tamperedCiphertext, iv, tag));
});

// ---------------------------------------------------------------------------
// 3. Zod Validation Schemas Tests
// ---------------------------------------------------------------------------
test("Password reset request schema normalizes email", () => {
  const schema = z.object({
    email: z.string().trim().email().transform((v) => v.toLowerCase()),
  });

  const parsed = schema.safeParse({ email: "  Advocate.Oly@Chamber.COM  " });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.email, "advocate.oly@chamber.com");
  }

  const invalid = schema.safeParse({ email: "not-an-email" });
  assert.equal(invalid.success, false);
});

test("Password reset verify schema enforces 6-digit numeric OTP", () => {
  const schema = z.object({
    requestId: z.string().min(1),
    otp: z.string().trim().regex(/^\d{6}$/),
  });

  assert.equal(schema.safeParse({ requestId: "req1", otp: "123456" }).success, true);
  assert.equal(schema.safeParse({ requestId: "req1", otp: "12345" }).success, false);
  assert.equal(schema.safeParse({ requestId: "req1", otp: "1234567" }).success, false);
  assert.equal(schema.safeParse({ requestId: "req1", otp: "abcdef" }).success, false);
});

test("Password reset confirm schema enforces length and matching confirmation", () => {
  const schema = z
    .object({
      requestId: z.string().min(1),
      resetToken: z.string().min(32),
      newPassword: z.string().min(8),
      confirmPassword: z.string().min(8),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

  // Valid password matching
  const token = crypto.randomBytes(32).toString("hex");
  const valid = schema.safeParse({
    requestId: "req1",
    resetToken: token,
    newPassword: "StrongPassword2026!",
    confirmPassword: "StrongPassword2026!",
  });
  assert.equal(valid.success, true);

  // Too short (< 8 chars)
  const short = schema.safeParse({
    requestId: "req1",
    resetToken: token,
    newPassword: "short",
    confirmPassword: "short",
  });
  assert.equal(short.success, false);

  // Mismatch
  const mismatch = schema.safeParse({
    requestId: "req1",
    resetToken: token,
    newPassword: "StrongPassword2026!",
    confirmPassword: "DifferentPassword2026!",
  });
  assert.equal(mismatch.success, false);
});

test("Password change request OTP schema requires current password", () => {
  const schema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
  });

  assert.equal(schema.safeParse({ currentPassword: "OldPassword123!" }).success, true);
  assert.equal(schema.safeParse({ currentPassword: "" }).success, false);
  assert.equal(schema.safeParse({}).success, false);
});


// ---------------------------------------------------------------------------
// 4. Inngest Workflow Idempotency & Lifecycle Tests
// ---------------------------------------------------------------------------
test("Inngest idempotency & lifecycle validation logic", () => {
  function checkRequestEligibility(doc) {
    if (!doc) return { valid: false, reason: "Request not found" };
    if (doc.status === "superseded") return { valid: false, reason: "Request superseded" };
    if (doc.status === "consumed" || doc.isConsumed) return { valid: false, reason: "Already consumed" };
    if (new Date() > new Date(doc.expiresAt) || doc.status === "expired")
      return { valid: false, reason: "Expired" };
    if (doc.deliveryStatus === "sent") return { valid: false, reason: "Already sent" };
    return { valid: true };
  }

  const now = Date.now();

  // Active eligible request
  assert.equal(
    checkRequestEligibility({
      status: "active",
      isConsumed: false,
      expiresAt: new Date(now + 600000),
      deliveryStatus: "pending",
    }).valid,
    true
  );

  // Stale/superseded request
  assert.equal(
    checkRequestEligibility({
      status: "superseded",
      isConsumed: false,
      expiresAt: new Date(now + 600000),
      deliveryStatus: "pending",
    }).valid,
    false
  );

  // Expired request
  assert.equal(
    checkRequestEligibility({
      status: "active",
      isConsumed: false,
      expiresAt: new Date(now - 10000),
      deliveryStatus: "pending",
    }).valid,
    false
  );

  // Already sent request (idempotency prevents duplicate emails)
  assert.equal(
    checkRequestEligibility({
      status: "active",
      isConsumed: false,
      expiresAt: new Date(now + 600000),
      deliveryStatus: "sent",
    }).valid,
    false
  );

  // Consumed request
  assert.equal(
    checkRequestEligibility({
      status: "consumed",
      isConsumed: true,
      expiresAt: new Date(now + 600000),
      deliveryStatus: "pending",
    }).valid,
    false
  );
});

// ---------------------------------------------------------------------------
// 5. Attempt Limit Enforcement Test
// ---------------------------------------------------------------------------
test("OTP attempt counter locks out after 5 failures", () => {
  let attempts = 0;
  const maxAttempts = 5;

  function attemptVerify(candidate, correct) {
    if (attempts >= maxAttempts) {
      return { success: false, lockedOut: true };
    }
    if (candidate === correct) {
      return { success: true, lockedOut: false };
    }
    attempts++;
    return {
      success: false,
      lockedOut: attempts >= maxAttempts,
      remaining: maxAttempts - attempts,
    };
  }

  // 4 failed attempts
  for (let i = 1; i <= 4; i++) {
    const res = attemptVerify("wrong", "123456");
    assert.equal(res.success, false);
    assert.equal(res.lockedOut, false);
    assert.equal(res.remaining, 5 - i);
  }

  // 5th failed attempt -> locks out
  const finalRes = attemptVerify("wrong", "123456");
  assert.equal(finalRes.success, false);
  assert.equal(finalRes.lockedOut, true);

  // 6th attempt with correct OTP is still locked out
  const subsequentRes = attemptVerify("123456", "123456");
  assert.equal(subsequentRes.success, false);
  assert.equal(subsequentRes.lockedOut, true);
});
