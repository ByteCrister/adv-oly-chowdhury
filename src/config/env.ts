import { z } from "zod";

/**
 * Zod schema defining the required structure and validation rules
 * for active application environment variables.
 */
export const envSchema = z.object({
  APP_URL: z
    .string()
    .url("APP_URL must be a valid URL")
    .optional(),

  // Database (MongoDB)
  MONGODB_URI: z
    .string({ message: "MONGODB_URI is required" })
    .min(1, "MONGODB_URI cannot be empty"),

  // Authentication (Auth.js / NextAuth)
  AUTH_SECRET: z
    .string({ message: "AUTH_SECRET is required" })
    .min(1, "AUTH_SECRET cannot be empty"),
  AUTH_URL: z
    .string()
    .url("AUTH_URL must be a valid URL")
    .optional(),

  // OAuth Providers (Google)
  GOOGLE_CLIENT_ID: z
    .string({ message: "GOOGLE_CLIENT_ID is required" })
    .min(1, "GOOGLE_CLIENT_ID cannot be empty"),
  GOOGLE_CLIENT_SECRET: z
    .string({ message: "GOOGLE_CLIENT_SECRET is required" })
    .min(1, "GOOGLE_CLIENT_SECRET cannot be empty"),

  // Security & Tokens
  JWT_SECRET: z
    .string({ message: "JWT_SECRET is required" })
    .min(1, "JWT_SECRET cannot be empty"),

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: z
    .string({ message: "CLOUDINARY_CLOUD_NAME is required" })
    .min(1, "CLOUDINARY_CLOUD_NAME cannot be empty"),
  CLOUDINARY_API_KEY: z
    .string({ message: "CLOUDINARY_API_KEY is required" })
    .min(1, "CLOUDINARY_API_KEY cannot be empty"),
  CLOUDINARY_API_SECRET: z
    .string({ message: "CLOUDINARY_API_SECRET is required" })
    .min(1, "CLOUDINARY_API_SECRET cannot be empty"),
  CLOUDINARY_FOLDER_NAME: z
    .string({ message: "CLOUDINARY_FOLDER_NAME is required" })
    .min(1, "CLOUDINARY_FOLDER_NAME cannot be empty"),
  // Upstash Redis Configuration
  UPSTASH_REDIS_REST_URL: z
    .string({ message: "UPSTASH_REDIS_REST_URL is required" })
    .url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z
    .string({ message: "UPSTASH_REDIS_REST_TOKEN is required" })
    .min(1, "UPSTASH_REDIS_REST_TOKEN cannot be empty"),

  // Cron Job Authentication
  CRON_SECRET: z
    .string()
    .min(16, "CRON_SECRET must be at least 16 characters for security")
    .optional(),

  // SMTP Email Configuration (Nodemailer)
  SMTP_USER: z
    .string({ message: "SMTP_USER is required" })
    .min(1, "SMTP_USER cannot be empty"),
  SMTP_PASSWORD: z
    .string({ message: "SMTP_PASSWORD is required" })
    .min(1, "SMTP_PASSWORD cannot be empty"),
  SMTP_HOST: z
    .string()
    .default("smtp.gmail.com"),
  SMTP_PORT: z
    .coerce
    .number()
    .default(465),
  SMTP_SECURE: z
    .coerce
    .boolean()
    .default(true),
  SMTP_FROM: z
    .string()
    .optional(),

  // Inngest Background Workflow Engine
  INNGEST_SIGNING_KEY: z
    .string({ message: "INNGEST_SIGNING_KEY is required" })
    .min(1, "INNGEST_SIGNING_KEY cannot be empty"),
  INNGEST_EVENT_KEY: z
    .string({ message: "INNGEST_EVENT_KEY is required" })
    .min(1, "INNGEST_EVENT_KEY cannot be empty"),
});

/**
 * Normalizes process.env with fallbacks for seamless backward compatibility.
 */
const rawEnv = {
  APP_URL: process.env.APP_URL,

  // Database: primary is MONGODB_URI, with DATABASE_URL fallback
  MONGODB_URI: process.env.MONGODB_URI,

  // Authentication: primary is AUTH_SECRET / AUTH_URL, with NEXTAUTH_* fallbacks
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_URL: process.env.AUTH_URL,

  // OAuth Credentials (Google)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  // JWT Secret
  JWT_SECRET: process.env.JWT_SECRET,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER_NAME: process.env.CLOUDINARY_FOLDER_NAME,

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

  // Cron Secret
  CRON_SECRET: process.env.CRON_SECRET,

  // SMTP Configuration
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT || "465",
  SMTP_SECURE: process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE : "true",
  SMTP_FROM: process.env.SMTP_FROM,

  // Inngest Configuration
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
};

const parsedEnv = envSchema.safeParse(rawEnv);

if (!parsedEnv.success) {
  const fieldErrors = parsedEnv.error.flatten().fieldErrors;
  const formattedErrors = Object.entries(fieldErrors)
    .map(([field, errors]) => `  - ${field}: ${errors?.join(", ")}`)
    .join("\n");

  console.error(
    `\n❌ [ENV VALIDATION ERROR] Invalid environment configuration:\n${formattedErrors}\n`
  );

  throw new Error(
    "Invalid or missing environment variables. Please check your .env.local file."
  );
}

/**
 * Type-safe, validated, and frozen environment configuration object.
 */
export const env = Object.freeze(parsedEnv.data);

export type Env = z.infer<typeof envSchema>;

export default env;
