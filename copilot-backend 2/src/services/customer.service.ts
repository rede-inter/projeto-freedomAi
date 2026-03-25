import { CustomerRepository } from '../repositories/customer.repository.js';
import { maskCustomerData } from '../utils/mask.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import type { CustomerPublic, SLAPublic } from '../types/index.js';

export const CustomerService = {
  /**
   * Returns masked customer data.
   * Throws NotFoundError if customer doesn't exist.
   */
  getCustomer(id: string): CustomerPublic {
    const customer = CustomerRepository.findById(id);
    if (!customer) throw new NotFoundError('Customer', id);
    return maskCustomerData(customer);
  },

  /**
   * Returns SLA with expiry and support-window flags.
   * Throws NotFoundError if customer or SLA not found.
   */
  getCustomerSla(id: string): SLAPublic {
    const customer = CustomerRepository.findById(id);
    if (!customer) throw new NotFoundError('Customer', id);

    const sla = CustomerRepository.findSlaByCustomerId(id);
    if (!sla) throw new NotFoundError('SLA para o customer', id);

    const now = new Date();
    const validUntil = new Date(sla.validUntil);
    const slaExpired = validUntil < now;

    let outsideSupportWindow = false;
    if (sla.supportHours === '8x5') {
      const hour = now.getUTCHours() + -3; // BRT = UTC-3
      const day = now.getUTCDay(); // 0=Sun, 6=Sat
      const isWeekend = day === 0 || day === 6;
      const isBusinessHour = hour >= 8 && hour < 17;
      outsideSupportWindow = isWeekend || !isBusinessHour;
    }

    const extraFields: SLAPublic['extraFields'] = {};
    if (slaExpired) extraFields.slaExpired = true;
    if (outsideSupportWindow) extraFields.outsideSupportWindow = true;

    return {
      ...sla,
      ...(Object.keys(extraFields).length > 0 ? { extraFields } : {}),
    };
  },

  listCustomers(): CustomerPublic[] {
    return CustomerRepository.findAll().map(maskCustomerData);
  },

  listCustomerSlas(): SLAPublic[] {
    const customers = CustomerRepository.findAll();
    return customers
      .map((c) => {
        try {
          return CustomerService.getCustomerSla(c.id);
        } catch {
          return null;
        }
      })
      .filter((s): s is SLAPublic => s !== null);
  },

  /**
   * Asserts customer exists and is active (not suspended/churned).
   * Used before creating a ticket.
   */
  assertCustomerActive(id: string): void {
    const customer = CustomerRepository.findById(id);
    if (!customer) throw new NotFoundError('Customer', id);
    if (customer.status === 'suspended') {
      throw new ForbiddenError(
        `Cliente '${id}' esta suspenso e nao pode abrir novos tickets. Entre em contato com o setor de cobranca.`,
      );
    }
    if (customer.status === 'churned') {
      throw new ForbiddenError(
        `Cliente '${id}' nao possui contrato ativo. Nao e possivel abrir tickets.`,
      );
    }
  },
};
