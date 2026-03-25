import type { Customer, SLA } from '../types/index.js';
import { CUSTOMERS_SEED, SLA_SEED } from '../mocks/customers.mock.js';

// In-memory store — cloned from seed so tests can mutate safely
let customersStore: Customer[] = [...CUSTOMERS_SEED];
let slaStore: SLA[] = [...SLA_SEED];

export const CustomerRepository = {
  findById(id: string): Customer | undefined {
    return customersStore.find((c) => c.id === id);
  },

  findAll(): Customer[] {
    return [...customersStore];
  },

  findSlaByCustomerId(customerId: string): SLA | undefined {
    return slaStore.find((s) => s.customerId === customerId);
  },

  /** Reset store to seed — used in tests */
  _reset(): void {
    customersStore = [...CUSTOMERS_SEED];
    slaStore = [...SLA_SEED];
  },
};
