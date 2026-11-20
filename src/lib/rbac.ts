// Matriks hak akses (dokumen bagian 4.5). Aturan dipakai di server pada setiap endpoint.

export type Role = 'PLATFORM_ADMIN' | 'ADMIN' | 'RISK_OWNER' | 'REVIEWER' | 'VIEWER';

export type Action =
  | 'dashboard.view'
  | 'risk.view'
  | 'risk.create'
  | 'risk.update'
  | 'risk.delete'
  | 'risk.submit'
  | 'risk.approve'
  | 'risk.retire'
  | 'risk.review'
  | 'appetite.manage'
  | 'settings.manage'
  | 'import.run'
  | 'export.run'
  | 'user.manage'
  | 'unit.manage'
  | 'audit.view'
  | 'organization.manage';

export interface Actor {
  id: string;
  role: Role;
  orgId: string | null;
  unitId: string | null;
}

const MATRIX: Record<Action, Role[]> = {
  'dashboard.view': ['ADMIN', 'RISK_OWNER', 'REVIEWER', 'VIEWER'],
  'risk.view': ['ADMIN', 'RISK_OWNER', 'REVIEWER', 'VIEWER'],
  'risk.create': ['ADMIN', 'RISK_OWNER'],
  'risk.update': ['ADMIN', 'RISK_OWNER'],
  'risk.delete': ['ADMIN'],
  'risk.submit': ['ADMIN', 'RISK_OWNER'],
  'risk.approve': ['ADMIN', 'REVIEWER'],
  'risk.retire': ['ADMIN', 'REVIEWER'],
  'risk.review': ['ADMIN', 'REVIEWER'],
  'appetite.manage': ['ADMIN'],
  'settings.manage': ['ADMIN'],
  'import.run': ['ADMIN', 'RISK_OWNER'],
  'export.run': ['ADMIN', 'RISK_OWNER', 'REVIEWER', 'VIEWER'],
  'user.manage': ['ADMIN'],
  'unit.manage': ['ADMIN'],
  'audit.view': ['ADMIN', 'REVIEWER', 'RISK_OWNER'],
  'organization.manage': ['PLATFORM_ADMIN'],
};

export function can(actor: Pick<Actor, 'role'>, action: Action): boolean {
  return MATRIX[action].includes(actor.role);
}

/** Apakah aktor melihat seluruh unit (Admin/Reviewer/Viewer) atau hanya unitnya (Risk Owner). */
export function seesAllUnits(actor: Pick<Actor, 'role'>): boolean {
  return actor.role !== 'RISK_OWNER';
}

interface RiskLike {
  unitId: string;
  ownerId: string;
  status: string;
}

/** Batas data yang boleh dilihat aktor: null = semua. */
export function unitScope(actor: Actor): string | null {
  return seesAllUnits(actor) ? null : actor.unitId;
}

/** Boleh mengubah isi risiko? Risk Owner hanya untuk unit sendiri dan saat Draft. */
export function canEditRisk(actor: Actor, risk: RiskLike): boolean {
  if (actor.role === 'ADMIN') return true;
  if (actor.role !== 'RISK_OWNER') return false;
  if (actor.unitId && risk.unitId !== actor.unitId) return false;
  return risk.status === 'DRAFT';
}

export function canViewRisk(actor: Actor, risk: RiskLike): boolean {
  if (seesAllUnits(actor)) return true;
  return !!actor.unitId && risk.unitId === actor.unitId;
}

export function canViewAuditOf(actor: Actor, risk: RiskLike): boolean {
  if (actor.role === 'ADMIN' || actor.role === 'REVIEWER') return true;
  if (actor.role === 'RISK_OWNER') return risk.unitId === actor.unitId;
  return false;
}

/** Aksi yang butuh status tertentu sebelum dijalankan. */
export function statusAllows(action: Action, status: string): boolean {
  switch (action) {
    case 'risk.submit':
      return status === 'DRAFT' || status === 'ACTIVE';
    case 'risk.approve':
      return status === 'SUBMITTED';
    case 'risk.retire':
      return status === 'ACTIVE';
    case 'risk.review':
      return status === 'ACTIVE';
    default:
      return true;
  }
}
