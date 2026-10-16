import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Load .env.local manually if running outside next dev
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_NAME = process.env.ADMIN_NAME || "Advocate Aminul Islam Chowdhury Oly";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "advocate@olychowdhury.com").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AdvocateOly2026!";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in environment or .env.local");
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    preferredName: { type: String, default: "Advocate Oly Chowdhury" },
    title: { type: String, default: "Advocate" },
    subtitle: { type: String, default: "Advocate • Judge's Court, Sylhet" },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, default: null, select: false },
    status: { type: String, default: "active" },
    isActive: { type: Boolean, default: true },
    phone: { type: String, default: "01712-459840" },
    whatsappNumber: { type: String, default: "+8801712459840" },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "users" }
);

const User = mongoose.models.User || mongoose.model("User", userSchema, "users");

async function seed() {
  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log(" Connected to MongoDB.");

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`ℹ️ Admin user (${ADMIN_EMAIL}) already exists. Updating password hash...`);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.updateOne({ email: ADMIN_EMAIL }, { passwordHash, isActive: true, status: "active" });
    console.log(` Password hash updated for: ${ADMIN_EMAIL}`);
  } else {
    console.log(`🌱 Creating new admin user: ${ADMIN_EMAIL}...`);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({
      name: ADMIN_NAME,
      preferredName: "Advocate Oly Chowdhury",
      title: "Advocate",
      subtitle: "Advocate • Judge's Court, Sylhet",
      email: ADMIN_EMAIL,
      passwordHash,
      status: "active",
      isActive: true,
      phone: "01712-459840",
      whatsappNumber: "+8801712459840",
    });
    console.log(` Successfully seeded admin user: ${ADMIN_EMAIL}`);
  }

  console.log("\n==========================================");
  console.log("🔑 Sign-in Credentials:");
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log("==========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
