import { z } from 'zod';

const index = z.coerce.number().int().min(1, 'Nilai 1 sampai 5').max(5, 'Nilai 1 sampai 5');

export const riskCreateSchema = z.object({
  type: z.enum(['THREAT', 'OPPORTUNITY']),
  category: z.string().min(1, 'Kategori wajib diisi'),
  unitId: z.string().min(1, 'Unit kerja wajib dipilih'),
  goal: z.string().min(1, 'Sasaran wajib diisi'),
  identifiedAt: z.coerce.date(),
  description: z.string().min(1, 'Deskripsi risiko wajib diisi'),
  rootCause: z.string().min(1, 'Akar penyebab wajib diisi'),
  indicator: z.string().min(1, 'Indikator risiko wajib diisi'),
  existingControl: z.string().default(''),
  qualitativeImpact: z.string().default(''),
  p: index,
  i: index,
  ownerId: z.string().min(1, 'Pemilik risiko wajib dipilih'),
  ownerTitle: z.string().default(''),
  strategy: z.enum(['AVOID', 'TRANSFER', 'MITIGATE', 'ACCEPT', 'EXPLOIT', 'SHARE', 'ENHANCE']),
  treatment: z.string().default(''),
  treatmentCost: z.coerce.number().min(0).default(0),
  actionsDone: z.string().optional().nullable(),
  rp: index,
  ri: index,
  nextReviewAt: z.coerce.date().optional().nullable(),
  version: z.coerce.number().int().optional(),
});

export const riskUpdateSchema = riskCreateSchema.partial();

export const reviewSchema = z.object({
  note: z.string().min(1, 'Catatan kajian wajib diisi'),
  rpAfter: index,
  riAfter: index,
});

export const rejectSchema = z.object({
  note: z.string().min(1, 'Alasan penolakan wajib diisi'),
});

export const settingsSchema = z.object({
  btr: z.coerce.number().min(0).optional(),
  totalRevenue: z.coerce.number().min(0).optional(),
  probPct: z
    .object({
      1: z.coerce.number().min(0).max(1),
      2: z.coerce.number().min(0).max(1),
      3: z.coerce.number().min(0).max(1),
      4: z.coerce.number().min(0).max(1),
      5: z.coerce.number().min(0).max(1),
    })
    .optional(),
  levels: z
    .object({
      low: z.coerce.number().int().min(1).max(24),
      medium: z.coerce.number().int().min(2).max(24),
      high: z.coerce.number().int().min(3).max(25),
    })
    .optional(),
});

export const appetiteSchema = z.object({
  category: z.string().min(1),
  unitId: z.string().optional().nullable(),
  maxScore: z.coerce.number().int().min(1).max(25),
  note: z.string().optional().nullable(),
});

export const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(10, 'Minimal 10 karakter'),
  role: z.enum(['ADMIN', 'RISK_OWNER', 'REVIEWER', 'VIEWER']),
  unitId: z.string().optional().nullable(),
});

export const unitSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['HEAD_OFFICE', 'BRANCH']),
});

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export type RiskInput = z.infer<typeof riskCreateSchema>;
