import { cache } from "react";
import { unstable_cache } from "next/cache";
import ConnectDB from "@/config/db";
import User from "@/db/models/User.model";
import "@/db/models/Asset.model";
import "@/db/models/AssetReference.model";
import { ADVOCATE_INFO } from "@/const/advocate";
import { USER_STATUSES } from "@/const/user.const";
import { env } from "@/config/env";
import { LANDING_CACHE_TAG } from "./landing.cache";
import type {
  LandingPageData,
  LandingProfile,
  LandingChamberInfo,
  LandingBarRegistrations,
} from "./landing.types";

interface PopulatedAsset {
  _id?: unknown;
  secureUrl?: string;
  publicId?: string;
  width?: number | null;
  height?: number | null;
  format?: string | null;
}

interface PopulatedAssetReference {
  _id?: unknown;
  deletedAt?: Date | null;
  assetId?: PopulatedAsset | null;
}

interface PublicUserDocument {
  _id?: unknown;
  name?: string;
  preferredName?: string | null;
  title?: string | null;
  subtitle?: string | null;
  tagline?: string | null;
  email?: string;
  phone?: string | null;
  alternatePhone?: string | null;
  whatsappNumber?: string | null;
  barCouncilId?: string | null;
  barAssociationMemberNo?: string | null;
  taxesBarMemberNo?: string | null;
  chamber?: {
    room?: string | null;
    barHall?: string | null;
    court?: string | null;
    city?: string | null;
    district?: string | null;
    fullAddress?: string | null;
    consultationHours?: string | null;
  };
  profileAssetReferenceId?: PopulatedAssetReference | null;
  isActive?: boolean;
  status?: string;
}

/**
 * Resolves the advocate's public profile image from the two-tier
 * User -> AssetReference -> Asset Cloudinary relationship.
 * Gracefully falls back to the static asset if missing, unpopulated, or soft-deleted.
 */
function resolveProfileImageUrl(
  profileRef?: PopulatedAssetReference | null
): string {
  if (!profileRef || profileRef.deletedAt) {
    return ADVOCATE_INFO.images.headshot;
  }

  const asset = profileRef.assetId;
  if (
    asset &&
    typeof asset === "object" &&
    typeof asset.secureUrl === "string" &&
    asset.secureUrl.trim().length > 0
  ) {
    return asset.secureUrl.trim();
  }

  return ADVOCATE_INFO.images.headshot;
}

/**
 * Normalizes phone numbers to standard and international formats.
 */
function formatInternationalPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("88")) return `+${digits}`;
  if (digits.startsWith("0")) return `+88${digits}`;
  return `+880${digits}`;
}

/**
 * Formats WhatsApp URL from phone string.
 */
function formatWhatsappUrl(rawNumber: string): string {
  const digits = rawNumber.replace(/[^\d]/g, "");
  if (digits.length >= 10) {
    return `https://wa.me/${digits.startsWith("88") ? digits : `88${digits.replace(/^0+/, "")}`}`;
  }
  return ADVOCATE_INFO.contact.whatsappUrl;
}

/**
 * Combines dynamic database user information with carefully selected static content,
 * applying strict precedence rules: database content when present and valid,
 * otherwise falling back to curated static constants.
 */
function transformToLandingData(
  user: PublicUserDocument | null
): LandingPageData {
  // Precedence: Database non-empty value -> ADVOCATE_INFO fallback
  const fullName =
    user?.name?.trim() || ADVOCATE_INFO.fullName;

  const preferredName =
    user?.preferredName?.trim() || ADVOCATE_INFO.preferredName;

  const title =
    user?.title?.trim() || ADVOCATE_INFO.title;

  const subtitle =
    user?.subtitle?.trim() || ADVOCATE_INFO.subtitle;

  const tagline =
    user?.tagline?.trim() || ADVOCATE_INFO.tagline;

  const heroDescription = ADVOCATE_INFO.heroDescription;

  const avatarUrl = resolveProfileImageUrl(user?.profileAssetReferenceId);

  const phone =
    user?.phone?.trim() || ADVOCATE_INFO.contact.phone;

  const phoneInternational = formatInternationalPhone(phone);
  const phoneDisplay = phone;

  const alternatePhone =
    user?.alternatePhone?.trim() || null;

  const whatsappNumber =
    user?.whatsappNumber?.trim() || ADVOCATE_INFO.contact.phoneInternational;

  const whatsappUrl = formatWhatsappUrl(whatsappNumber);

  const email =
    user?.email?.trim() || ADVOCATE_INFO.contact.email;

  const chamber: LandingChamberInfo = {
    room: user?.chamber?.room?.trim() || ADVOCATE_INFO.chamber.room,
    barHall: user?.chamber?.barHall?.trim() || ADVOCATE_INFO.chamber.barHall,
    court: user?.chamber?.court?.trim() || ADVOCATE_INFO.chamber.court,
    city: user?.chamber?.city?.trim() || ADVOCATE_INFO.chamber.city,
    district: user?.chamber?.district?.trim() || "Sylhet",
    fullAddress:
      user?.chamber?.fullAddress?.trim() || ADVOCATE_INFO.chamber.fullAddress,
    consultationHours:
      user?.chamber?.consultationHours?.trim() ||
      ADVOCATE_INFO.chamber.consultationHours,
  };

  const barRegistrations: LandingBarRegistrations = {
    barCouncilId: user?.barCouncilId?.trim() || null,
    barAssociationMemberNo: user?.barAssociationMemberNo?.trim() || null,
    taxesBarMemberNo: user?.taxesBarMemberNo?.trim() || null,
  };

  const profile: LandingProfile = {
    fullName,
    preferredName,
    title,
    subtitle,
    tagline,
    heroDescription,
    avatarUrl,
    phone,
    phoneInternational,
    phoneDisplay,
    alternatePhone,
    whatsappNumber,
    whatsappUrl,
    email,
    barRegistrations,
    chamber,
  };

  // Structured static data
  const affiliations = ADVOCATE_INFO.affiliations.map((a) => ({
    name: a.name,
    shortName: a.name,
    country: a.country,
    role: a.role,
    established: "established" in a ? a.established : undefined,
    description: a.description,
    highlight: a.highlight,
  }));

  const credentials = ADVOCATE_INFO.credentials.map((c) => ({
    degree: c.degree,
    title: c.title,
    field: c.field,
  }));

  const practiceAreas = ADVOCATE_INFO.practiceAreas.map((p) => ({
    id: p.id,
    title: p.title,
    summary: p.summary,
    description: p.description,
    points: [...p.points],
    icon: p.icon,
  }));

  const siteUrl = env.APP_URL || "https://advocateaico.com";
  const canonicalUrl = "/";

  const metaTitle = `${preferredName} | ${title} • ${chamber.court}, ${chamber.city}`;
  const metaDescription = `${fullName} (${subtitle}). ${tagline}. Legal chambers: ${chamber.fullAddress}. Telephone: ${phone}.`;

  return {
    profile,
    affiliations,
    credentials,
    practiceAreas,
    meta: {
      siteUrl,
      canonicalUrl,
      title: metaTitle,
      description: metaDescription,
      ogImage: avatarUrl,
      keywords: [
        fullName,
        preferredName,
        "Advocate Sylhet",
        "Judge's Court Sylhet",
        "Sylhet District Bar Association",
        "Sylhet Taxes Bar Association",
        "Taxation Lawyer Sylhet",
        "Civil Litigation Sylhet",
        "Criminal Defense Advocate Sylhet",
      ],
    },
  };
}

/**
 * Executes direct server-side database query to retrieve the authoritative site owner profile.
 * Employs deterministic lookup without exposing visitors' session context or private credentials.
 */
async function fetchAuthoritativeProfile(): Promise<PublicUserDocument | null> {
  try {
    await ConnectDB();

    // 1. Query conditions: Match configured admin email if set, or query active advocate user
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    const query = adminEmail
      ? { email: adminEmail, isActive: true }
      : {
          $or: [
            { email: "advocate@olychowdhury.com", isActive: true },
            { isActive: true, status: USER_STATUSES.ACTIVE },
          ],
        };

    const user = (await User.findOne(query)
      .sort({ createdAt: 1 })
      .select(
        "name preferredName title subtitle tagline email phone alternatePhone whatsappNumber barCouncilId barAssociationMemberNo taxesBarMemberNo chamber profileAssetReferenceId isActive status"
      )
      .populate({
        path: "profileAssetReferenceId",
        match: { deletedAt: null },
        select: "_id assetId deletedAt",
        populate: {
          path: "assetId",
          select: "_id secureUrl publicId width height format",
        },
      })
      .lean()) as PublicUserDocument | null;

    return user;
  } catch (error) {
    // Graceful fallback during build-time rendering if database is temporarily unreachable
    console.warn(
      "[LandingService] Database query failed; using fallback static profile:",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Underlying cached fetcher wrapped with Next.js `unstable_cache`.
 * Revalidated on-demand when profile or headshot mutation completes.
 */
const getCachedLandingData = unstable_cache(
  async (): Promise<LandingPageData> => {
    const rawUser = await fetchAuthoritativeProfile();
    return transformToLandingData(rawUser);
  },
  ["landing-page-full-data"],
  {
    tags: [LANDING_CACHE_TAG],
    revalidate: 86400, // 24-hour background revalidation interval
  }
);

/**
 * Assembles the full landing page dataset.
 * Combines React `cache` (per-request deduping across metadata & page render)
 * with Next.js `unstable_cache` (cross-request caching with on-demand tag revalidation).
 */
export const getLandingPageData = cache(async (): Promise<LandingPageData> => {
  return await getCachedLandingData();
});
