/**
 * One-time sandbox customer adjust:
 * 1) Upgrade existing customers to fuller high-profile CRM cards
 * 2) Add 15 new varied high-profile customers (hotel / restaurant / store)
 *
 * Existing customer IDs are preserved so historical orders stay linked.
 *
 * Usage:
 *   npx tsx scripts/seed-high-profile-customers.ts
 *   npx tsx scripts/seed-high-profile-customers.ts --dry-run
 *   npx tsx scripts/seed-high-profile-customers.ts --profile=rifqi_tjahyono
 */
import { randomUUID } from 'crypto';
import {
  CompanyType,
  CustomerStatus,
  PartnershipStage,
  PrismaClient,
  RelationshipLevel,
} from '@prisma/client';
import { buildCustomerSku } from '../src/customers/customer-sku';

const prisma = new PrismaClient();

type CustomerSeed = {
  /** When set, update this existing row instead of creating. */
  id?: string;
  name: string;
  title: string;
  companyName: string;
  companyType: CompanyType;
  email: string;
  phone: string;
  address: string;
  additionalAddress: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  partnershipStage: PartnershipStage;
  status: CustomerStatus;
  customerNeeds: string;
  desiredStandards: string;
  promiseAnnualBonus: boolean;
  promiseOnTimeDelivery: boolean;
  promisePackagingBox: boolean;
  relationshipLevel: RelationshipLevel;
  approvalPercentage: number;
  remarks: string;
};

/** Upgrade paths for the three current customers (same IDs). */
const EXISTING_UPGRADES: CustomerSeed[] = [
  {
    id: '00000000-0000-4000-8000-000000000011',
    name: 'Siti Aminah',
    title: 'Group Purchasing Manager',
    companyName: 'Plataran Indonesia',
    companyType: CompanyType.RESTAURANT,
    email: 'siti.aminah@plataran.demo',
    phone: '+6281211001101',
    address: 'Jl. HR Rasuna Said Kav. C-5',
    additionalAddress: 'Central purchasing — Tower A Lantai 12',
    postalCode: '12940',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.DIRECT_VISIT,
    status: CustomerStatus.INTERESTED,
    customerNeeds:
      'Weekly chilled ayam & kambing program for multi-outlet kitchen',
    desiredStandards: 'Halal MUI, cold-chain 0–4°C, grade A trim',
    promiseAnnualBonus: true,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.CLOSING_FIRST_ORDER,
    approvalPercentage: 88,
    remarks: 'High-profile restaurant group — priority account',
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    name: 'Budi Santoso',
    title: 'Director of Procurement',
    companyName: 'The Dharmawangsa Jakarta',
    companyType: CompanyType.HOTEL,
    email: 'budi.santoso@dharmawangsa.demo',
    phone: '+6281299002202',
    address: 'Jl. Brawijaya Raya No. 26',
    additionalAddress: 'Purchasing office — back of house',
    postalCode: '12160',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.EMAIL,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'Premium daging sapi tenderloin & minyak frying line',
    desiredStandards: 'Export-grade cuts, vacuum pack, delivery before 06:00',
    promiseAnnualBonus: true,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.NEGOTIATION,
    approvalPercentage: 72,
    remarks: '5-star hotel account — tender review Q3',
  },
  {
    id: 'cd5d879b-e3f7-46bc-a29e-ea2cf0208fff',
    name: 'Shin Tae Yong',
    title: 'Head of Fresh Merchandising',
    companyName: 'Farmers Market Indonesia',
    companyType: CompanyType.STORE,
    email: 'shin.taeyong@farmersmarket.demo',
    phone: '+6281188003303',
    address: 'Jl. Asia Afrika No. 8',
    additionalAddress: 'Category office — Fresh protein',
    postalCode: '10270',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.WHATSAPP,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'Nationwide retail pack program for ayam & sapi',
    desiredStandards: 'Barcode-ready 500/1000 g packs, shelf-life ≥ 5 days',
    promiseAnnualBonus: false,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.CLOSING_FIRST_ORDER,
    approvalPercentage: 95,
    remarks: 'Premium retail chain — high volume potential',
  },
];

/** 15 new high-profile customers across segments & cities. */
const NEW_CUSTOMERS: CustomerSeed[] = [
  {
    name: 'Alya Rahmani',
    title: 'Executive Chef',
    companyName: 'Kaum Jakarta',
    companyType: CompanyType.RESTAURANT,
    email: 'alya.rahmani@kaum.demo',
    phone: '+6281311004404',
    address: 'Jl. Dr. Ide Anak Agung Gde Agung',
    additionalAddress: 'Kitchen office',
    postalCode: '12950',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.DIRECT_VISIT,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'Heritage Indonesian protein — kambing & ayam kampung',
    desiredStandards: 'Traceable farms, butchery notes per cut',
    promiseAnnualBonus: false,
    promiseOnTimeDelivery: true,
    promisePackagingBox: false,
    relationshipLevel: RelationshipLevel.REQUEST_SAMPLE,
    approvalPercentage: 65,
    remarks: 'Chef-driven fine dining',
  },
  {
    name: 'Raka Pratama',
    title: 'Purchasing Director',
    companyName: 'Mandarin Oriental Jakarta',
    companyType: CompanyType.HOTEL,
    email: 'raka.pratama@mohotel.demo',
    phone: '+6281212005505',
    address: 'Jl. M.H. Thamrin',
    additionalAddress: 'Procurement — Level B1',
    postalCode: '10310',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.EMAIL,
    status: CustomerStatus.DOUBTFUL,
    customerNeeds: 'Banquet-scale minyak & premium sapi',
    desiredStandards: 'International hotel brand specs + HACCP docs',
    promiseAnnualBonus: true,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.INITIAL_APPROACH,
    approvalPercentage: 35,
    remarks: 'Corporate vendor registration pending',
  },
  {
    name: 'Dewi Kartika',
    title: 'Category Manager — Protein',
    companyName: 'Ranch Market',
    companyType: CompanyType.STORE,
    email: 'dewi.kartika@ranchmarket.demo',
    phone: '+6281513006606',
    address: 'Jl. Kemang Raya No. 3',
    additionalAddress: 'Merchandising hub',
    postalCode: '12730',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.EMAIL,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'Retail-ready chilled packs for weekend demand spikes',
    desiredStandards: 'Consistent trim, labeled weight, MAP packaging',
    promiseAnnualBonus: true,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.NEGOTIATION,
    approvalPercentage: 70,
    remarks: 'Premium supermarket chain',
  },
  {
    name: 'Made Wirawan',
    title: 'F&B Procurement Lead',
    companyName: 'Four Seasons Resort Bali at Sayan',
    companyType: CompanyType.HOTEL,
    email: 'made.wirawan@fourseasons.demo',
    phone: '+6281234007707',
    address: 'Sayan, Ubud',
    additionalAddress: 'Receiving dock — cold room 2',
    postalCode: '80571',
    city: 'Gianyar',
    province: 'Bali',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.WHATSAPP,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'Resort F&B: ayam karkas + sapi giling weekly',
    desiredStandards: 'Air-freight capable packaging, arrival < 8°C',
    promiseAnnualBonus: false,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.CLOSING_FIRST_ORDER,
    approvalPercentage: 82,
    remarks: 'Bali luxury resort — seasonal peaks',
  },
  {
    name: 'Nadia Kusuma',
    title: 'Owner & Culinary Director',
    companyName: 'Locavore Collective',
    companyType: CompanyType.RESTAURANT,
    email: 'nadia.kusuma@locavore.demo',
    phone: '+6281745008808',
    address: 'Jl. Dewi Sri No. 88',
    additionalAddress: '',
    postalCode: '80361',
    city: 'Badung',
    province: 'Bali',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.DIRECT_VISIT,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'Small-lot specialty cuts; tasting samples monthly',
    desiredStandards: 'Single-origin farms, no antibiotic growth promoters',
    promiseAnnualBonus: false,
    promiseOnTimeDelivery: true,
    promisePackagingBox: false,
    relationshipLevel: RelationshipLevel.REQUEST_SAMPLE,
    approvalPercentage: 58,
    remarks: 'Chef-owned destination restaurant',
  },
  {
    name: 'Hendra Wijaya',
    title: 'Supply Chain Manager',
    companyName: 'Hero Supermarket',
    companyType: CompanyType.STORE,
    email: 'hendra.wijaya@hero.demo',
    phone: '+6281296009909',
    address: 'Jl. Asia Afrika Lot 19',
    additionalAddress: 'DC coordination desk',
    postalCode: '10270',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.EMAIL,
    status: CustomerStatus.OTHERS,
    customerNeeds: 'Multi-DC allocation for Java stores',
    desiredStandards: 'EDI ASN, carton labeling, slot booking',
    promiseAnnualBonus: true,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.WILL_CONTACT,
    approvalPercentage: 45,
    remarks: 'National retail — RFP cycle',
  },
  {
    name: 'Putri Anggraini',
    title: 'Purchasing Manager',
    companyName: 'Shangri-La Surabaya',
    companyType: CompanyType.HOTEL,
    email: 'putri.anggraini@shangri-la.demo',
    phone: '+6281133010101',
    address: 'Jl. Mayjen Sungkono No. 120',
    additionalAddress: 'Purchasing department',
    postalCode: '60224',
    city: 'Surabaya',
    province: 'Jawa Timur',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.EMAIL,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'Hotel kitchen protein + frying oil program',
    desiredStandards: 'Brand-approved suppliers list, COA on file',
    promiseAnnualBonus: true,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.NEGOTIATION,
    approvalPercentage: 68,
    remarks: 'East Java flagship hotel',
  },
  {
    name: 'Fajar Nugroho',
    title: 'Operations Director',
    companyName: 'Gudeg Yu Djum Group',
    companyType: CompanyType.RESTAURANT,
    email: 'fajar.nugroho@yudjum.demo',
    phone: '+6281577011111',
    address: 'Jl. Wijilan No. 167',
    additionalAddress: 'Central kitchen',
    postalCode: '55132',
    city: 'Yogyakarta',
    province: 'DI Yogyakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.WHATSAPP,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'High-volume ayam for central kitchen & outlets',
    desiredStandards: 'Consistent size grades, morning delivery',
    promiseAnnualBonus: false,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.CLOSING_FIRST_ORDER,
    approvalPercentage: 90,
    remarks: 'Heritage F&B group — high throughput',
  },
  {
    name: 'Laras Wulandari',
    title: 'Merchandising Lead',
    companyName: 'The FoodHall',
    companyType: CompanyType.STORE,
    email: 'laras.wulandari@foodhall.demo',
    phone: '+6281288012121',
    address: 'Grand Indonesia West Mall',
    additionalAddress: 'Fresh counter office',
    postalCode: '10310',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.DIRECT_VISIT,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'Gourmet counter: tenderloin & giling display packs',
    desiredStandards: 'Premium visual trim, consumer-ready trays',
    promiseAnnualBonus: false,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.REQUEST_SAMPLE,
    approvalPercentage: 60,
    remarks: 'Urban gourmet retailer',
  },
  {
    name: 'Andi Saputra',
    title: 'General Manager',
    companyName: 'Hotel Claro Makassar',
    companyType: CompanyType.HOTEL,
    email: 'andi.saputra@clarohotel.demo',
    phone: '+6281144013131',
    address: 'Jl. A.P. Pettarani No. 3',
    additionalAddress: '',
    postalCode: '90222',
    city: 'Makassar',
    province: 'Sulawesi Selatan',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.WHATSAPP,
    status: CustomerStatus.DOUBTFUL,
    customerNeeds: 'Eastern Indonesia hotel supply — ayam & minyak',
    desiredStandards: 'Reliable inter-island logistics partners',
    promiseAnnualBonus: false,
    promiseOnTimeDelivery: true,
    promisePackagingBox: false,
    relationshipLevel: RelationshipLevel.INITIAL_APPROACH,
    approvalPercentage: 28,
    remarks: 'Regional hotel — logistics is the gate',
  },
  {
    name: 'Citra Melati',
    title: 'Head of Culinary',
    companyName: 'Bandung Convention Hotel',
    companyType: CompanyType.HOTEL,
    email: 'citra.melati@bch.demo',
    phone: '+6281222014141',
    address: 'Jl. Asia Afrika No. 65',
    additionalAddress: 'Banquet kitchen',
    postalCode: '40111',
    city: 'Bandung',
    province: 'Jawa Barat',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.EMAIL,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'MICE banquet protein planning (peak weekends)',
    desiredStandards: 'Flexible order cut-off, surge capacity',
    promiseAnnualBonus: true,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.NEGOTIATION,
    approvalPercentage: 55,
    remarks: 'Convention-heavy calendar',
  },
  {
    name: 'Yoga Prasetya',
    title: 'Owner',
    companyName: 'Bebek Tepi Sawah',
    companyType: CompanyType.RESTAURANT,
    email: 'yoga.prasetya@tepisisawah.demo',
    phone: '+6281799015151',
    address: 'Jl. Raya Goa Gajah',
    additionalAddress: 'Outlet purchasing WhatsApp desk',
    postalCode: '80571',
    city: 'Gianyar',
    province: 'Bali',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.WHATSAPP,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'Multi-outlet ayam & minyak for tourist seasons',
    desiredStandards: 'Competitive pack pricing, 48h delivery Bali-wide',
    promiseAnnualBonus: false,
    promiseOnTimeDelivery: true,
    promisePackagingBox: false,
    relationshipLevel: RelationshipLevel.CLOSING_FIRST_ORDER,
    approvalPercentage: 78,
    remarks: 'Popular tourist F&B brand',
  },
  {
    name: 'Sari Handayani',
    title: 'Procurement Specialist',
    companyName: 'JW Marriott Medan',
    companyType: CompanyType.HOTEL,
    email: 'sari.handayani@marriott.demo',
    phone: '+6281266016161',
    address: 'Jl. Putri Hijau No. 10',
    additionalAddress: 'Purchasing',
    postalCode: '20111',
    city: 'Medan',
    province: 'Sumatera Utara',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.EMAIL,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'North Sumatra hotel protein program',
    desiredStandards: 'Marriott-approved vendor documentation',
    promiseAnnualBonus: true,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.WILL_CONTACT,
    approvalPercentage: 42,
    remarks: 'International brand — compliance first',
  },
  {
    name: 'Bambang Hartono',
    title: 'Commercial Director',
    companyType: CompanyType.STORE,
    companyName: 'Super Indo Fresh Desk',
    email: 'bambang.hartono@superindo.demo',
    phone: '+6281511017171',
    address: 'Jl. Jend. Gatot Subroto Kav. 38',
    additionalAddress: 'National fresh category',
    postalCode: '12710',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.DIRECT_VISIT,
    status: CustomerStatus.NOT_INTERESTED,
    customerNeeds: 'Pilot SKU listing for 20 stores (Jabodetabek)',
    desiredStandards: 'National pricing grid, promo calendar support',
    promiseAnnualBonus: true,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.INITIAL_APPROACH,
    approvalPercentage: 15,
    remarks: 'Mass retail — long evaluation cycle',
  },
  {
    name: 'Rina Maharani',
    title: 'Founder',
    companyName: 'Seoul Garden Indonesia',
    companyType: CompanyType.RESTAURANT,
    email: 'rina.maharani@seoulgarden.demo',
    phone: '+6281388018181',
    address: 'Jl. Prof. Dr. Satrio Kav. 18',
    additionalAddress: 'Central purchasing',
    postalCode: '12940',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    country: 'Indonesia',
    partnershipStage: PartnershipStage.WHATSAPP,
    status: CustomerStatus.INTERESTED,
    customerNeeds: 'BBQ restaurant chain: sliced sapi & kambing',
    desiredStandards: 'Thin-slice capable cuts, consistent marbling',
    promiseAnnualBonus: true,
    promiseOnTimeDelivery: true,
    promisePackagingBox: true,
    relationshipLevel: RelationshipLevel.NEGOTIATION,
    approvalPercentage: 74,
    remarks: 'Korean BBQ multi-outlet brand',
  },
];

function parseArgs(argv: string[]) {
  let dryRun = false;
  let profileName = process.env.SEED_PROFILE_NAME?.trim() || 'rifqi_tjahyono';
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    if (arg.startsWith('--profile=')) {
      profileName = arg.slice('--profile='.length).trim() || profileName;
    }
  }
  return { dryRun, profileName };
}

function toData(seed: CustomerSeed, id: string) {
  const sku = buildCustomerSku(seed.name, seed.companyType, id);
  return {
    name: seed.name,
    sku,
    title: seed.title,
    companyName: seed.companyName,
    companyType: seed.companyType,
    email: seed.email,
    phone: seed.phone,
    address: seed.address,
    additionalAddress: seed.additionalAddress,
    postalCode: seed.postalCode,
    city: seed.city,
    province: seed.province,
    country: seed.country,
    partnershipStage: seed.partnershipStage,
    status: seed.status,
    customerNeeds: seed.customerNeeds,
    desiredStandards: seed.desiredStandards,
    promiseAnnualBonus: seed.promiseAnnualBonus,
    promiseOnTimeDelivery: seed.promiseOnTimeDelivery,
    promisePackagingBox: seed.promisePackagingBox,
    relationshipLevel: seed.relationshipLevel,
    approvalPercentage: seed.approvalPercentage,
    remarks: seed.remarks,
  };
}

async function main() {
  const { dryRun, profileName } = parseArgs(process.argv.slice(2));
  const profile = await prisma.profile.findUnique({
    where: { profileName },
  });
  if (!profile) {
    throw new Error(`Profile not found: ${profileName}`);
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Profile ${profileName} (${profile.id})`,
  );

  const upgraded: string[] = [];
  for (const seed of EXISTING_UPGRADES) {
    if (!seed.id) continue;
    const existing = await prisma.customer.findUnique({
      where: { id: seed.id },
    });
    if (!existing || existing.profileId !== profile.id) {
      console.warn(`skip upgrade — missing id ${seed.id}`);
      continue;
    }
    const data = toData(seed, seed.id);
    console.log(
      `${dryRun ? 'would upgrade' : 'upgrade'}: ${existing.name} @ ${existing.companyName} → ${seed.name} @ ${seed.companyName} (${seed.companyType})`,
    );
    if (!dryRun) {
      await prisma.customer.update({
        where: { id: seed.id },
        data,
      });
    }
    upgraded.push(seed.name);
  }

  const created: string[] = [];
  for (const seed of NEW_CUSTOMERS) {
    const already = await prisma.customer.findFirst({
      where: {
        profileId: profile.id,
        OR: [{ email: seed.email }, { name: seed.name, companyName: seed.companyName }],
      },
    });
    if (already) {
      console.log(`skip existing: ${seed.name} @ ${seed.companyName}`);
      continue;
    }
    const id = randomUUID();
    const data = toData(seed, id);
    console.log(
      `${dryRun ? 'would create' : 'create'}: ${seed.name} · ${seed.companyName} (${seed.companyType}) sku=${data.sku}`,
    );
    if (!dryRun) {
      await prisma.customer.create({
        data: {
          id,
          profileId: profile.id,
          ...data,
        },
      });
    }
    created.push(seed.name);
  }

  const total = await prisma.customer.count({
    where: { profileId: profile.id },
  });

  console.log(
    JSON.stringify(
      {
        dryRun,
        upgraded: upgraded.length,
        created: created.length,
        totalCustomers: dryRun ? total + created.length : total,
        createdNames: created,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
