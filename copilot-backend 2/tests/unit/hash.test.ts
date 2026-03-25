import { describe, it, expect } from 'vitest';
import { generateTicketHash } from '../../src/utils/hash.js';

describe('generateTicketHash', () => {
  it('returns same hash for identical inputs', () => {
    const h1 = generateTicketHash('CUST-001', 'Titulo do ticket', 'Descricao longa o suficiente aqui para testar');
    const h2 = generateTicketHash('CUST-001', 'Titulo do ticket', 'Descricao longa o suficiente aqui para testar');
    expect(h1).toBe(h2);
  });

  it('is case-insensitive and trims whitespace', () => {
    const h1 = generateTicketHash('CUST-001', '  Titulo do ticket  ', 'descricao aqui');
    const h2 = generateTicketHash('CUST-001', 'TITULO DO TICKET', 'DESCRICAO AQUI');
    expect(h1).toBe(h2);
  });

  it('returns different hash for different customerId', () => {
    const h1 = generateTicketHash('CUST-001', 'Titulo', 'Descricao');
    const h2 = generateTicketHash('CUST-002', 'Titulo', 'Descricao');
    expect(h1).not.toBe(h2);
  });

  it('returns different hash for different title', () => {
    const h1 = generateTicketHash('CUST-001', 'Titulo A', 'Descricao');
    const h2 = generateTicketHash('CUST-001', 'Titulo B', 'Descricao');
    expect(h1).not.toBe(h2);
  });

  it('returns different hash for different description', () => {
    const h1 = generateTicketHash('CUST-001', 'Titulo', 'Descricao A');
    const h2 = generateTicketHash('CUST-001', 'Titulo', 'Descricao B');
    expect(h1).not.toBe(h2);
  });

  it('returns a 16-char hex string', () => {
    const h = generateTicketHash('CUST-001', 'Titulo', 'Descricao');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic across calls', () => {
    const results = Array.from({ length: 5 }, () =>
      generateTicketHash('CUST-001', 'Titulo Fixo', 'Descricao Fixa'),
    );
    expect(new Set(results).size).toBe(1);
  });
});
