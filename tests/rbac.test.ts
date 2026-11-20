import { describe, expect, it } from 'vitest';
import {
  can,
  canEditRisk,
  canViewRisk,
  seesAllUnits,
  statusAllows,
  type Actor,
} from '../src/lib/rbac';

const admin: Actor = { id: '1', role: 'ADMIN', orgId: 'org', unitId: 'u1' };
const owner: Actor = { id: '2', role: 'RISK_OWNER', orgId: 'org', unitId: 'u1' };
const reviewer: Actor = { id: '3', role: 'REVIEWER', orgId: 'org', unitId: 'u1' };
const viewer: Actor = { id: '4', role: 'VIEWER', orgId: 'org', unitId: 'u1' };

const risk = (unitId: string, status = 'DRAFT') => ({ unitId, ownerId: '2', status });

describe('rbac', () => {
  it('hanya Admin yang mengatur appetite, kriteria, pengguna, dan unit', () => {
    expect(can(admin, 'appetite.manage')).toBe(true);
    expect(can(owner, 'appetite.manage')).toBe(false);
    expect(can(admin, 'settings.manage')).toBe(true);
    expect(can(reviewer, 'settings.manage')).toBe(false);
    expect(can(viewer, 'user.manage')).toBe(false);
  });

  it('Reviewer boleh menyetujui, Risk Owner hanya mengajukan', () => {
    expect(can(reviewer, 'risk.approve')).toBe(true);
    expect(can(owner, 'risk.approve')).toBe(false);
    expect(can(owner, 'risk.submit')).toBe(true);
    expect(can(viewer, 'risk.submit')).toBe(false);
  });

  it('Risk Owner hanya melihat dan mengubah risiko unitnya saat Draft', () => {
    expect(canViewRisk(owner, risk('u1'))).toBe(true);
    expect(canViewRisk(owner, risk('u2'))).toBe(false);
    expect(canEditRisk(owner, risk('u1', 'DRAFT'))).toBe(true);
    expect(canEditRisk(owner, risk('u1', 'ACTIVE'))).toBe(false);
    expect(canEditRisk(owner, risk('u2', 'DRAFT'))).toBe(false);
    expect(canViewRisk(reviewer, risk('u2'))).toBe(true);
  });

  it('Admin dan Reviewer melihat seluruh unit', () => {
    expect(seesAllUnits(admin)).toBe(true);
    expect(seesAllUnits(reviewer)).toBe(true);
    expect(seesAllUnits(owner)).toBe(false);
  });

  it('status memengaruhi aksi yang tersedia', () => {
    expect(statusAllows('risk.submit', 'DRAFT')).toBe(true);
    expect(statusAllows('risk.submit', 'SUBMITTED')).toBe(false);
    expect(statusAllows('risk.approve', 'SUBMITTED')).toBe(true);
    expect(statusAllows('risk.approve', 'DRAFT')).toBe(false);
    expect(statusAllows('risk.retire', 'ACTIVE')).toBe(true);
  });
});
