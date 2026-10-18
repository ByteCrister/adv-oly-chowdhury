export interface AdvocateAffiliation {
  name: string;
  shortName: string;
  badge?: string;
  description: string;
}

export interface PracticeArea {
  id: string;
  title: string;
  description: string;
  details: string[];
  iconName: string;
}

export interface AcademicCredential {
  degree: string;
  title: string;
  institutionCategory: string;
  focus: string;
}

export const ADVOCATE_INFO = {
  fullName: "Aminul Islam Chowdhury Oly",
  preferredName: "Advocate Oly Chowdhury",
  initials: "AICO",
  title: "Advocate",
  subtitle: "Advocate • Judge's Court, Sylhet",
  tagline: "Distinguished Legal Counsel Grounded in Academic Rigor, Ethical Integrity & Vigorous Advocacy",
  heroDescription:
    "Providing strategic legal representation and counsel before the Judge's Court, Sylhet, and specialist revenue tribunals. Combining deep statutory analysis with dedicated courtroom trial practice.",
  
  credentials: [
    { degree: "LL.M", title: "Master of Laws", field: "Advanced Legal Jurisprudence & Research" },
    { degree: "LL.B", title: "Bachelor of Laws", field: "Core Laws, Civil & Criminal Procedure" },
    { degree: "M.S.S", title: "Master of Social Science", field: "Socio-Legal Dynamics & Policy Analysis" },
    { degree: "B.S.S (Hon's)", title: "Bachelor of Social Science (Honours)", field: "Governance, Society & Analytical Studies" },
  ],

  affiliations: [
    {
      name: "Sylhet District Bar Association",
      country: "Bangladesh",
      role: "Member Advocate",
      description: "Practicing advocate actively appearing before the civil and criminal courts of Sylhet district judiciary.",
      highlight: "District Judiciary",
    },
    {
      name: "Sylhet District Taxes Bar Association",
      country: "Bangladesh",
      role: "Member Advocate",
      established: "ESTD. 1974",
      description: "Specialist member handling direct tax, revenue disputes, assessments, and appellate tax matters.",
      highlight: "Taxation & Revenue Specialist",
    },
    {
      name: "International Bar Association (IBA)",
      country: "International",
      role: "Member",
      description: "Affiliated with the world's leading organization of international legal practitioners, bar associations, and law societies.",
      highlight: "Global Legal Standards",
    },
  ],

  chamber: {
    room: "Chamber No. 323 (3rd Floor)",
    barHall: "Bar Hall No: 02",
    court: "Judge's Court",
    city: "Sylhet",
    country: "Bangladesh",
    fullAddress: "Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge's Court, Sylhet, Bangladesh",
    consultationHours: "Saturday – Thursday (Court & Chamber Hours)",
  },

  contact: {
    phone: "01712-459840",
    phoneInternational: "+8801712459840",
    phoneDisplay: "+880 1712-459840",
    email: "advocateaico@gmail.com",
    whatsappUrl: "https://wa.me/8801712459840",
  },

  images: {
    headshot: "/images/profile/img-1.png",
    courtroom: "/images/profile/img-1.png",
  },

  practiceAreas: [
    {
      id: "taxation",
      title: "Taxation & Revenue Law",
      summary: "Specialist tax counsel backed by active membership in the Sylhet District Taxes Bar Association (ESTD. 1974).",
      description: "Comprehensive advisory and dispute resolution in direct taxation, income tax assessment, corporate tax filing, tax appeals, and revenue tribunal hearings.",
      points: [
        "Income Tax Return filing & assessment dispute advisory",
        "Appeals before Appellate Joint Commissioner & Tax Tribunal",
        "Withholding tax compliance & revenue dispute defense",
        "Business structuring for tax efficiency and compliance",
      ],
      icon: "ReceiptText",
    },
    {
      id: "civil-litigation",
      title: "Civil Litigation & Property Law",
      summary: "Strategic representation in substantive civil actions and land disputes before the District Judiciary.",
      description: "Handling high-stakes title suits, declaration proceedings, partition suits, recovery of possession, temporary injunctions, and execution of court decrees.",
      points: [
        "Title suits, declaration of ownership & partition suits",
        "Temporary and permanent injunction petitions",
        "Specific performance of contract & monetary claims",
        "Execution proceedings and civil revision / appeals",
      ],
      icon: "Scale",
    },
    {
      id: "criminal-defense",
      title: "Criminal Defense & Trial Advocacy",
      summary: "Dedicated defense safeguarding constitutional rights, personal liberty, and fair trial standards.",
      description: "Vigorous defense representation across pre-trial, bail petitions, framing of charges, cross-examination, and appellate revisional matters before the Sessions Court.",
      points: [
        "Regular and anticipatory bail petitions",
        "Trial defense in Sessions Court and Magistrate Court",
        "Negotiable Instruments Act (Cheque Dishonour / Section 138)",
        "Criminal revisions, appeals, and quashment advocacy",
      ],
      icon: "ShieldAlert",
    },
    {
      id: "corporate-commercial",
      title: "Corporate & Commercial Advisory",
      summary: "Pragmatic legal guidance tailored for businesses, partnerships, and commercial entities.",
      description: "Providing contractual drafting, regulatory compliance, commercial lease agreements, partnership deeds, and dispute negotiation for domestic and regional enterprises.",
      points: [
        "Commercial contract drafting, vetting & risk auditing",
        "Partnership formation, deed execution & dissolution",
        "Statutory regulatory compliance & trade licensing guidance",
        "Pre-litigation commercial negotiation and settlement",
      ],
      icon: "Briefcase",
    },
    {
      id: "land-conveyancing",
      title: "Land Documentation & Conveyancing",
      summary: "Thorough title vetting, deed drafting, and registration procedures in Sylhet division.",
      description: "Detailed investigation of title deeds, chain of ownership, land records (CS, SA, RS, BS/City Survey), deed drafting, mutation assistance, and sub-registry procedures.",
      points: [
        "Title search & ownership chain verification",
        "Drafting sale deeds, gift deeds (Heba), and powers of attorney",
        "Mutation record corrections and land tax disputes",
        "Legal scrutiny reports for banking and financial mortgages",
      ],
      icon: "FileCheck2",
    },
    {
      id: "family-succession",
      title: "Family Law & Estate Succession",
      summary: "Sensitive and legally sound guidance in inheritance, succession certificates, and family matters.",
      description: "Assisting families and beneficiaries in partition of ancestral estates, succession certificate issuance, guardianship petitions, and family court dispute settlements.",
      points: [
        "Succession certificates and probate of estate proceedings",
        "Muslim personal law inheritance calculation and partition",
        "Family court maintenance, dower, and custody matters",
        "Mediation and amicable family dispute settlement",
      ],
      icon: "Users2",
    },
  ],

  navLinks: [
    { label: "About", href: "#about" },
    { label: "Practice Areas", href: "#practice" },
    { label: "Affiliations", href: "#affiliations" },
    { label: "Credentials", href: "#credentials" },
    { label: "Chamber", href: "#chamber" },
    { label: "Contact", href: "#contact" },
  ],
} as const;
