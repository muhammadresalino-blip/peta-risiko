import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hash = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
};

const PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'Admin12345!';

const BTR = 545_834_931_553;
const REVENUE = 1_269_383_561_751;
const PROB = { 1: 0.1, 2: 0.25, 3: 0.5, 4: 0.7, 5: 0.9 } as const;

const evalRisk = (p: 1 | 2 | 3 | 4 | 5, i: 1 | 2 | 3 | 4 | 5) => {
  const score = p * i;
  const financialImpact = Math.round((i / 5) * BTR);
  return {
    score,
    level: score <= 3 ? 'LOW' : score <= 6 ? 'MEDIUM' : score <= 12 ? 'HIGH' : 'EXTREME',
    probPct: PROB[p],
    financialImpact,
    netValue: Math.round(PROB[p] * financialImpact),
  };
};

async function main() {
  console.log('Seeding PetaRisiko…');

  await prisma.auditLog.deleteMany();
  await prisma.riskReview.deleteMany();
  await prisma.riskSnapshot.deleteMany();
  await prisma.importMapping.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.riskAppetite.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.riskCategory.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: 'PT Cakrawala Nusantara Air Tbk. (contoh)',
      slug: 'cakrawala-air',
      currency: 'IDR',
    },
  });

  const units = await Promise.all(
    [
      ['Head Office', 'HEAD_OFFICE'],
      ['Quality Control', 'HEAD_OFFICE'],
      ['Flight Operations', 'HEAD_OFFICE'],
      ['Finance', 'HEAD_OFFICE'],
      ['Information Technology', 'HEAD_OFFICE'],
      ['Branch Surabaya', 'BRANCH'],
    ].map(([name, kind]) => prisma.unit.create({ data: { orgId: org.id, name, kind } })),
  );
  const unit = (name: string) => units.find((u) => u.name === name)!;

  const categories = [
    'Strategy and Planning',
    'Finance',
    'Operational / Infrastructure Risk',
    'Hazard',
  ];
  for (const name of categories) {
    await prisma.riskCategory.create({ data: { orgId: org.id, name } });
  }

  const admin = await prisma.user.create({
    data: {
      orgId: org.id,
      email: process.env.ADMIN_SEED_EMAIL || 'admin@petarisiko.local',
      name: 'Admin Manajemen Risiko',
      passwordHash: hash(PASSWORD),
      role: 'ADMIN',
      unitId: unit('Head Office').id,
    },
  });
  const owner = await prisma.user.create({
    data: {
      orgId: org.id,
      email: 'owner@petarisiko.local',
      name: 'Rani Prameswari',
      passwordHash: hash(PASSWORD),
      role: 'RISK_OWNER',
      unitId: unit('Flight Operations').id,
    },
  });
  const reviewer = await prisma.user.create({
    data: {
      orgId: org.id,
      email: 'reviewer@petarisiko.local',
      name: 'Budi Santosa',
      passwordHash: hash(PASSWORD),
      role: 'REVIEWER',
      unitId: unit('Head Office').id,
    },
  });
  await prisma.user.create({
    data: {
      orgId: org.id,
      email: 'viewer@petarisiko.local',
      name: 'Dewi Kartika',
      passwordHash: hash(PASSWORD),
      role: 'VIEWER',
      unitId: unit('Head Office').id,
    },
  });
  await prisma.user.create({
    data: {
      email: 'platform@petarisiko.local',
      name: 'Platform Admin',
      passwordHash: hash(PASSWORD),
      role: 'PLATFORM_ADMIN',
    },
  });

  await prisma.setting.createMany({
    data: [
      { orgId: org.id, key: 'btr', value: JSON.stringify(BTR) },
      { orgId: org.id, key: 'totalRevenue', value: JSON.stringify(REVENUE) },
      { orgId: org.id, key: 'probPct', value: JSON.stringify(PROB) },
      {
        orgId: org.id,
        key: 'levelThresholds',
        value: JSON.stringify({ low: 3, medium: 6, high: 12 }),
      },
    ],
  });

  await prisma.riskAppetite.createMany({
    data: [
      { orgId: org.id, category: 'Operational / Infrastructure Risk', unitId: null, maxScore: 6 },
      { orgId: org.id, category: 'Finance', unitId: null, maxScore: 8 },
      { orgId: org.id, category: 'Hazard', unitId: null, maxScore: 4 },
      { orgId: org.id, category: 'Strategy and Planning', unitId: null, maxScore: 12 },
    ],
  });

  const samples = [
    {
      code: 'LAG001',
      category: 'Operational / Infrastructure Risk',
      unitId: unit('Flight Operations').id,
      goal: 'Jadwal penerbangan harus tepat waktu',
      description: 'Keterlambatan jam terbang',
      rootCause: 'Pengecekan teknis pesawat tidak berjadwal; cuaca buruk',
      indicator: 'Keterlambatan jam terbang; ketidakpuasan penumpang',
      existingControl: 'Pemindahan penumpang ke jadwal penerbangan lain',
      qualitativeImpact: 'Perusahaan harus mengalokasikan biaya kompensasi kepada penumpang',
      p: 4 as const,
      i: 4 as const,
      treatment: 'Evaluasi jadwal maintenance; bayar kompensasi penumpang',
      treatmentCost: 54_000_000,
      rp: 2 as const,
      ri: 2 as const,
      strategy: 'MITIGATE',
    },
    {
      code: 'LAG002',
      category: 'Operational / Infrastructure Risk',
      unitId: unit('Quality Control').id,
      goal: 'Tingkat kecelakaan kerja nol',
      description: 'Kecelakaan kerja saat penanganan bagasi',
      rootCause: 'Alat angkat rusak dan prosedur K3 tidak dijalankan konsisten',
      indicator: 'Laporan insiden K3 meningkat',
      existingControl: 'Briefing K3 harian dan inspeksi alat',
      qualitativeImpact: 'Cedera pekerja dan sanksi regulator',
      p: 4 as const,
      i: 3 as const,
      treatment: 'Peremajaan alat angkat dan pelatihan K3 ulang',
      treatmentCost: 120_000_000,
      rp: 3 as const,
      ri: 2 as const,
      strategy: 'MITIGATE',
    },
    {
      code: 'FIN001',
      category: 'Finance',
      unitId: unit('Finance').id,
      goal: 'Arus kas operasional positif setiap kuartal',
      description: 'Piutang maskapai mitra macet',
      rootCause: 'Kontrak tanpa jaminan dan penagihan manual',
      indicator: 'Umur piutang di atas 90 hari',
      existingControl: 'Pengingat tagihan bulanan',
      qualitativeImpact: 'Gangguan likuiditas perusahaan',
      p: 3 as const,
      i: 4 as const,
      treatment: 'Ubah syarat pembayaran dan otomatisasi penagihan',
      treatmentCost: 35_000_000,
      rp: 2 as const,
      ri: 3 as const,
      strategy: 'TRANSFER',
    },
  ];

  const seededRisks: {
    id: string;
    score: number;
    level: string;
    scoreRes: number;
    levelRes: string;
    netValue: number;
    netValueRes: number;
  }[] = [];

  for (const s of samples) {
    const inherent = evalRisk(s.p, s.i);
    const residual = evalRisk(s.rp, s.ri);
    const created = await prisma.risk.create({
      data: {
        orgId: org.id,
        code: s.code,
        status: 'ACTIVE',
        type: 'THREAT',
        category: s.category,
        unitId: s.unitId,
        goal: s.goal,
        identifiedAt: new Date('2026-01-15'),
        description: s.description,
        rootCause: s.rootCause,
        indicator: s.indicator,
        existingControl: s.existingControl,
        qualitativeImpact: s.qualitativeImpact,
        p: s.p,
        i: s.i,
        ...inherent,
        ownerId: owner.id,
        ownerTitle: 'Operational Director',
        strategy: s.strategy,
        treatment: s.treatment,
        treatmentCost: s.treatmentCost,
        rp: s.rp,
        ri: s.ri,
        scoreRes: residual.score,
        levelRes: residual.level,
        probPctRes: residual.probPct,
        financialImpactRes: residual.financialImpact,
        netValueRes: residual.netValue,
        aboveAppetite: residual.score > 6,
        nextReviewAt: new Date('2027-02-28'),
      },
    });
    seededRisks.push({
      id: created.id,
      score: created.score,
      level: created.level,
      scoreRes: created.scoreRes,
      levelRes: created.levelRes,
      netValue: created.netValue,
      netValueRes: created.netValueRes,
    });

    await prisma.riskReview.create({
      data: {
        riskId: created.id,
        reviewerId: reviewer.id,
        note: 'Kajian awal: rencana penanganan dinilai memadai, lanjutkan pemantauan triwulanan.',
        rpAfter: s.rp,
        riAfter: s.ri,
      },
    });
    await prisma.auditLog.create({
      data: {
        orgId: org.id,
        actorId: admin.id,
        entity: 'Risk',
        entityId: created.id,
        action: 'CREATE',
        after: JSON.stringify({ code: created.code, status: created.status }),
      },
    });
  }

  // Snapshot contoh tiga periode: nilai bersih sedikit lebih tinggi di periode lampau
  // agar grafik tren di dashboard langsung memperlihatkan perbaikan.
  const periods = [
    { period: '2026-09', inherent: 1.12, residual: 1.15 },
    { period: '2026-10', inherent: 1.06, residual: 1.08 },
    { period: '2026-11', inherent: 1, residual: 1 },
  ];
  for (const p of periods) {
    for (const risk of seededRisks) {
      await prisma.riskSnapshot.create({
        data: {
          orgId: org.id,
          riskId: risk.id,
          period: p.period,
          score: risk.score,
          level: risk.level,
          scoreRes: risk.scoreRes,
          levelRes: risk.levelRes,
          netValue: Math.round(risk.netValue * p.inherent),
          netValueRes: Math.round(risk.netValueRes * p.residual),
        },
      });
    }
  }

  console.log('Selesai.');
  console.log(`  Organisasi : ${org.name}`);
  console.log(`  Admin      : ${admin.email} / ${PASSWORD}`);
  console.log(`  Risk Owner : owner@petarisiko.local / ${PASSWORD}`);
  console.log(`  Reviewer   : reviewer@petarisiko.local / ${PASSWORD}`);
  console.log(`  Viewer     : viewer@petarisiko.local / ${PASSWORD}`);
  console.log('  Snapshot   : 2026-09 s.d. 2026-11 (data contoh)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
