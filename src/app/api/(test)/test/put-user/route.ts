import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import ConnectDB from "@/config/db";
import User from "@/db/models/User.model";
import { DEFAULT_CHAMBER_ADDRESS, DEFAULT_HOME_ADDRESS } from "@/utils/zod";
import { USER_STATUSES } from "@/const";
import { revalidateLandingCache } from "@/lib/landing";

/**
 * Hardcoded complete test user object for testing Advocate Oly Chowdhury's chamber portal.
 */
const DEFAULT_TEST_USER = {
  name: "Advocate Aminul Islam Chowdhury Oly",
  preferredName: "Advocate Oly Chowdhury",
  title: "Advocate",
  subtitle: "Advocate • Judge's Court, Sylhet",
  tagline: "Distinguished legal counsel specializing in civil, criminal, and constitutional litigation",
  email: "advocate@olychowdhury.com",
  rawPassword: "aA1!123",
  status: USER_STATUSES.ACTIVE,
  isActive: true,
  barCouncilId: "BC-SYL-2012-4891",
  barAssociationMemberNo: "SBA-3892",
  taxesBarMemberNo: "STBA-1044",
  phone: "01712-459840",
  alternatePhone: "01819-123456",
  whatsappNumber: "+8801712459840",
  chamber: {
    room: DEFAULT_CHAMBER_ADDRESS.room,
    barHall: DEFAULT_CHAMBER_ADDRESS.barHall,
    court: DEFAULT_CHAMBER_ADDRESS.court,
    city: DEFAULT_CHAMBER_ADDRESS.city,
    district: DEFAULT_CHAMBER_ADDRESS.district,
    fullAddress: DEFAULT_CHAMBER_ADDRESS.fullAddress,
    consultationHours: DEFAULT_CHAMBER_ADDRESS.consultationHours,
  },
  homeAddress: {
    presentAddress: "House 14, Road 3, Upashahar, Sylhet",
    permanentAddress: "Sylhet Sadar, Sylhet",
    city: DEFAULT_HOME_ADDRESS.city,
    postalCode: "3100",
  },
};

/**
 * POST /api/test/put-user
 * Seeds or upserts the hardcoded test user with hashed password in the MongoDB database.
 * Accepts optional JSON body overrides if custom values are provided.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Parse optional body overrides
    const body = await req.json().catch(() => ({}));

    const name = body?.name || DEFAULT_TEST_USER.name;
    const preferredName = body?.preferredName || DEFAULT_TEST_USER.preferredName;
    const title = body?.title || DEFAULT_TEST_USER.title;
    const subtitle = body?.subtitle || DEFAULT_TEST_USER.subtitle;
    const tagline = body?.tagline !== undefined ? body.tagline : DEFAULT_TEST_USER.tagline;
    const email = (body?.email || DEFAULT_TEST_USER.email).toLowerCase().trim();
    const rawPassword = body?.password || DEFAULT_TEST_USER.rawPassword;
    const phone = body?.phone || DEFAULT_TEST_USER.phone;
    const alternatePhone = body?.alternatePhone || DEFAULT_TEST_USER.alternatePhone;
    const whatsappNumber = body?.whatsappNumber || DEFAULT_TEST_USER.whatsappNumber;
    const barCouncilId = body?.barCouncilId || DEFAULT_TEST_USER.barCouncilId;
    const barAssociationMemberNo = body?.barAssociationMemberNo || DEFAULT_TEST_USER.barAssociationMemberNo;
    const taxesBarMemberNo = body?.taxesBarMemberNo || DEFAULT_TEST_USER.taxesBarMemberNo;
    const status = body?.status || DEFAULT_TEST_USER.status;
    const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : DEFAULT_TEST_USER.isActive;

    const chamber = {
      ...DEFAULT_TEST_USER.chamber,
      ...(body?.chamber || {}),
    };

    const homeAddress = {
      ...DEFAULT_TEST_USER.homeAddress,
      ...(body?.homeAddress || {}),
    };

    // 2. Hash the password with bcrypt (cost factor 12)
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    // 3. Connect to Database
    await ConnectDB();

    // 4. Upsert user in collection (creates if not existing, updates if existing)
    const userDoc = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          preferredName,
          title,
          subtitle,
          tagline,
          email,
          passwordHash,
          status,
          isActive,
          phone,
          alternatePhone,
          whatsappNumber,
          barCouncilId,
          barAssociationMemberNo,
          taxesBarMemberNo,
          chamber,
          homeAddress,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    // Invalidate landing page cache so changes are immediately visible
    revalidateLandingCache();

    // 5. Return success response with credentials for testing
    return NextResponse.json(
      {
        success: true,
        message: "Test user successfully seeded/updated in database.",
        data: {
          id: userDoc?._id?.toString(),
          name: userDoc?.name,
          preferredName: userDoc?.preferredName,
          title: userDoc?.title,
          subtitle: userDoc?.subtitle,
          email: userDoc?.email,
          phone: userDoc?.phone,
          whatsappNumber: userDoc?.whatsappNumber,
          chamber: userDoc?.chamber,
          homeAddress: userDoc?.homeAddress,
          status: userDoc?.status,
          isActive: userDoc?.isActive,
        },
        credentials: {
          email,
          password: rawPassword,
          loginUrl: "/signin",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error putting test user into database:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to put test user in database.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/put-user
 * Convenience handler to allow triggering user creation directly via browser or simple GET request.
 */
export async function GET(req: NextRequest) {
  return POST(req);
}
