import { describe, it, expect } from 'vitest';
import { calculatePriority } from '../../src/utils/priority.js';

describe('calculatePriority', () => {
  it('P1 for outage + critical', () => {
    const r = calculatePriority({ category: 'outage', impactLevel: 'critical', affectedUsers: 1, segment: 'smb' });
    expect(r.priority).toBe('P1');
  });

  it('P1 for outage + 100+ users regardless of impactLevel', () => {
    const r = calculatePriority({ category: 'outage', impactLevel: 'low', affectedUsers: 100, segment: 'smb' });
    expect(r.priority).toBe('P1');
  });

  it('P2 for outage + high impact', () => {
    const r = calculatePriority({ category: 'outage', impactLevel: 'high', affectedUsers: 5, segment: 'smb' });
    expect(r.priority).toBe('P2');
  });

  it('P2 for outage + medium impact', () => {
    const r = calculatePriority({ category: 'outage', impactLevel: 'medium', affectedUsers: 5, segment: 'smb' });
    expect(r.priority).toBe('P2');
  });

  it('P2 for outage with no impact level', () => {
    const r = calculatePriority({ category: 'outage', impactLevel: null, affectedUsers: 5, segment: 'smb' });
    expect(r.priority).toBe('P2');
  });

  it('P2 for bug + critical', () => {
    const r = calculatePriority({ category: 'bug', impactLevel: 'critical', affectedUsers: 1, segment: 'smb' });
    expect(r.priority).toBe('P2');
  });

  it('P3 for bug + high on non-enterprise', () => {
    const r = calculatePriority({ category: 'bug', impactLevel: 'high', affectedUsers: 1, segment: 'smb' });
    expect(r.priority).toBe('P3');
  });

  it('P2 for bug + high on enterprise (floor rule)', () => {
    const r = calculatePriority({ category: 'bug', impactLevel: 'high', affectedUsers: 1, segment: 'enterprise' });
    expect(r.priority).toBe('P2');
  });

  it('P4 for feature', () => {
    const r = calculatePriority({ category: 'feature', impactLevel: null, affectedUsers: 1, segment: 'enterprise' });
    expect(r.priority).toBe('P4');
  });

  it('P4 for question', () => {
    const r = calculatePriority({ category: 'question', impactLevel: 'high', affectedUsers: 50, segment: 'enterprise' });
    expect(r.priority).toBe('P4');
  });

  it('P2 for enterprise bug with default priority', () => {
    const r = calculatePriority({ category: 'bug', impactLevel: 'low', affectedUsers: 1, segment: 'enterprise' });
    expect(r.priority).toBe('P2');
  });

  it('P3 for bug + medium on smb (default)', () => {
    const r = calculatePriority({ category: 'bug', impactLevel: 'medium', affectedUsers: 1, segment: 'smb' });
    expect(r.priority).toBe('P3');
  });

  it('always returns a reason string', () => {
    const r = calculatePriority({ category: 'bug', impactLevel: 'low', affectedUsers: 1, segment: 'mid' });
    expect(typeof r.reason).toBe('string');
    expect(r.reason.length).toBeGreaterThan(0);
  });
});
