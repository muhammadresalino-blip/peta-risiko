import { describe, expect, it } from 'vitest';
import { NO_UNIT, riskScope, unitFilter } from '../src/lib/tenant';
import type { Actor } from '../src/lib/rbac';

const admin: Actor = { id: '1', role: 'ADMIN', orgId: 'org', unitId: 'u1' };
const owner: Actor = { id: '2', role: 'RISK_OWNER', orgId: 'org', unitId: 'u1' };
const ownerWithoutUnit: Actor = { id: '3', role: 'RISK_OWNER', orgId: 'org', unitId: null };
const viewer: Actor = { id: '4', role: 'VIEWER', orgId: 'org', unitId: 'u1' };

describe('tenant scope', () => {
  it('Admin/Viewer melihat seluruh unit organisasi', () => {
    expect(riskScope(admin)).toEqual({ orgId: 'org' });
    expect(riskScope(viewer)).toEqual({ orgId: 'org' });
  });

  it('Risk Owner selalu dibatasi ke unitnya', () => {
    expect(riskScope(owner)).toEqual({ orgId: 'org', unitId: 'u1' });
  });

  it('Risk Owner tanpa unit tidak otomatis melihat seluruh organisasi', () => {
    expect(riskScope(ownerWithoutUnit)).toEqual({ orgId: 'org', unitId: NO_UNIT });
  });

  it('filter unit tidak bisa dipakai untuk keluar dari scope unit sendiri', () => {
    // Bug lama: ?unit=u2 menimpa scope Risk Owner dan membocorkan unit lain.
    expect(unitFilter(owner, 'u2')).toBe('u1');
    expect(unitFilter(owner, null)).toBe('u1');
    expect(unitFilter(ownerWithoutUnit, 'u2')).toBe(NO_UNIT);
    expect(unitFilter(admin, 'u2')).toBe('u2');
    expect(unitFilter(admin, null)).toBeUndefined();
  });

  it('organisasi kosong memakai sentinel, bukan seluruh data', () => {
    expect(riskScope({ id: '5', role: 'ADMIN', orgId: null, unitId: null })).toEqual({ orgId: NO_UNIT });
  });
});
