import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { ZodError } from "zod";
import ConnectDB from "@/config/db";

/**
 * Custom error class for API handlers.
 * Allows throwing typed HTTP errors that withErrorHandler will catch
 * and translate into standardized JSON responses with proper status codes.
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  static badRequest(message = "Bad Request", details?: unknown) {
    return new ApiError(message, 400, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(message, 401);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(message, 403);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(message, 404);
  }

  static conflict(message = "Conflict", details?: unknown) {
    return new ApiError(message, 409, details);
  }

  static internal(message = "Internal Server Error") {
    return new ApiError(message, 500);
  }
}

/**
 * Handles errors thrown within the route handler, converting them
 * into appropriate HTTP responses.
 */
function handleRouteError(err: unknown): NextResponse {
  // 0. Re-throw Next.js internal control-flow signals (e.g. NEXT_PRERENDER_INTERRUPTED,
  //    NEXT_REDIRECT). These are not real errors — they are framework-level signals that
  //    must propagate up for Next.js to handle correctly.
  if (
    err instanceof Error &&
    "digest" in err &&
    typeof (err as { digest?: string }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_")
  ) {
    throw err;
  }

  // 1. Custom ApiError
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
      { status: err.status }
    );
  }

  // 2. Zod validation errors
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Validation failed",
        errors: err.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // 3. Mongoose Schema Validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors: Record<string, string> = {};
    for (const [field, item] of Object.entries(err.errors)) {
      errors[field] = item.message;
    }
    return NextResponse.json(
      {
        message: "Validation failed",
        errors,
      },
      { status: 400 }
    );
  }

  // 4. Mongoose CastError (e.g. invalid MongoDB ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    return NextResponse.json(
      {
        message: `Invalid ${err.path}: ${String(err.value)}`,
      },
      { status: 400 }
    );
  }

  // 5. MongoDB Duplicate Key error (E11000)
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  ) {
    const mongoErr = err as { keyValue?: Record<string, unknown> };
    const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue)[0] : "field";
    return NextResponse.json(
      {
        message: `${field} already exists`,
      },
      { status: 409 }
    );
  }

  // 6. Generic JavaScript Error
  if (err instanceof Error) {
    console.error("Unhandled API Error:", err);
    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === "production"
            ? "Internal Server Error"
            : err.message,
      },
      { status: 500 }
    );
  }

  // 7. Unknown thrown values
  console.error("Unknown API Error:", err);
  return NextResponse.json(
    {
      message: "An unexpected error occurred",
    },
    { status: 500 }
  );
}

/**
 * Production-grade API route handler wrapper for Next.js App Router with MongoDB / Mongoose.
 *
 * Benefits:
 * - Automatically ensures MongoDB connection via ConnectDB()
 * - Returns response directly to the frontend without redundant nested `{ data: ... }` wrappers
 * - Pass-through for custom `Response` / `NextResponse` returns (e.g., status 201, headers, redirects)
 * - Centralized handling for Mongoose (CastError, ValidationError, duplicate key), Zod, and ApiError
 *
 * @param fn - The route handler function
 * @returns Wrapped route handler compatible with Next.js App Router
 */
export function withErrorHandler<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response | T> | Response | T
): (...args: Args) => Promise<Response> {
  return async (...args: Args): Promise<Response> => {
    try {
      await ConnectDB();
      const result = await fn(...args);

      // If the handler already returned a Response / NextResponse, pass it through
      if (result instanceof Response) {
        return result;
      }

      // Return the payload directly without extra wrapping
      return NextResponse.json(result, { status: 200 });
    } catch (err: unknown) {
      return handleRouteError(err);
    }
  };
}