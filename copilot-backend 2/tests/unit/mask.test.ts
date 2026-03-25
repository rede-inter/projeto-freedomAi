import { describe, it, expect } from 'vitest';
import { maskEmail, maskCnpj, maskCpf, maskPhone, maskCustomerData } from '../../src/utils/mask.js';

describe('maskEmail', () => {
  it('masks local part keeping first 3 chars', () => {
    expect(maskEmail('joao@empresa.com.br')).toBe('joa***@empresa.com.br');
  });

  it('handles short local parts', () => {
    expect(maskEmail('ab@teste.com')).toBe('***@teste.com');
  });

  it('handles missing @ gracefully', () => {
    expect(maskEmail('invalidemail')).toBe('***@***.***');
  });

  it('never returns the full email', () => {
    const masked = maskEmail('operacoes@alpha.com.br');
    expect(masked).not.toBe('operacoes@alpha.com.br');
    expect(masked).toContain('***');
  });
});

describe('maskCnpj', () => {
  it('masks CNPJ showing only middle digits', () => {
    const result = maskCnpj('12.345.678/0001-90');
    expect(result).toContain('**');
    expect(result).not.toContain('12');
    expect(result).not.toContain('90');
  });

  it('handles non-formatted CNPJ', () => {
    const result = maskCnpj('12345678000190');
    expect(result).toContain('**');
  });
});

describe('maskCpf', () => {
  it('masks CPF', () => {
    const result = maskCpf('123.456.789-00');
    expect(result).toContain('***');
    expect(result).not.toContain('123');
  });
});

describe('maskPhone', () => {
  it('masks phone keeping last 4 digits', () => {
    const result = maskPhone('(11) 98765-4321');
    expect(result).toContain('4321');
    expect(result).toContain('*');
    expect(result).not.toContain('9876');
  });
});

describe('maskCustomerData', () => {
  it('masks all sensitive fields on customer object', () => {
    const customer = {
      id: 'CUST-001',
      name: 'Empresa Teste',
      cnpj: '12.345.678/0001-90',
      email: 'ops@empresa.com.br',
      phone: '(11) 91234-5678',
      segment: 'enterprise' as const,
      accountManager: 'Joao',
      status: 'active' as const,
      contractId: 'CTR-001',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const masked = maskCustomerData(customer);

    expect(masked.email).not.toBe('ops@empresa.com.br');
    expect(masked.cnpj).not.toBe('12.345.678/0001-90');
    expect(masked.phone).not.toBe('(11) 91234-5678');

    // Non-sensitive fields unchanged
    expect(masked.id).toBe('CUST-001');
    expect(masked.name).toBe('Empresa Teste');
    expect(masked.segment).toBe('enterprise');
  });
});
