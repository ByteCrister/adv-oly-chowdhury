import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import ConnectDB from "@/config/db";
import User from "@/db/models/User.model";
import { rateLimit, isInCooldown, setCooldown } from "@/lib/services/redis.service";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_S = 60;
const FAILED_ATTEMPT_COOLDOWN_S = 10;

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting (5 attempts per 60 seconds)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown-ip";

    const allowed = await rateLimit(`signin:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many sign-in attempts from this IP. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    // 2. Parse & Validate Payload
    const body = await req.json().catch(() => null);
    const email = body?.email ? String(body.email).trim().toLowerCase() : "";
    const password = body?.password ? String(body.password) : "";

    if (!email || !email.includes("@") || !password) {
      return NextResponse.json(
        { error: "A valid email address and password are required." },
        { status: 400 }
      );
    }

    // 3. Check Account Cooldown (temporary block after failed login attempts)
    const coolingDown = await isInCooldown("signin_fail", email);
    if (coolingDown) {
      return NextResponse.json(
        { error: "Too many failed attempts for this account. Please wait 10 seconds before trying again." },
        { status: 429 }
      );
    }

    // 4. Query user in Database
    await ConnectDB();
    const user = await User.findOne({ email, isActive: true })
      .select("+passwordHash name email _id status")
      .lean();

    if (!user || !user.passwordHash) {
      // Set cooldown even if user is not found to prevent user enumeration timing attacks
      await setCooldown("signin_fail", email, FAILED_ATTEMPT_COOLDOWN_S);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // 5. Compare Password Hash
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      await setCooldown("signin_fail", email, FAILED_ATTEMPT_COOLDOWN_S);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // 6. Record last login timestamp asynchronously
    User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).catch((err) => {
      console.warn("Could not record lastLoginAt:", err);
    });

    // 7. Return verified User ID for NextAuth to issue session
    return NextResponse.json(
      {
        data: {
          userId: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Credentials verification error:", error);
    return NextResponse.json(
      { error: "Internal server error during credential verification." },
      { status: 500 }
    );
  }
}
