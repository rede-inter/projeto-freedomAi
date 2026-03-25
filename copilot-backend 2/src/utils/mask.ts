/**
 * Masks sensitive data fields before returning to the client.
 * Rules: never expose full CPF, CNPJ, email, or phone.
 */

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';
  const [local, domain] = email.split('@');
  if (local.length <= 3) return `***@${domain}`;
  return `${local.slice(0, 3)}***@${domain}`;
}

export function maskCnpj(cnpj: string): string {
  // Format: XX.XXX.XXX/YYYY-ZZ → **.***.***/YY01-**
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return '**.***.***/****-**';
  return `**.***.***/${digits.slice(8, 12)}-**`;
}

export function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.***.**${digits.slice(8, 11).slice(0, 1)}-**`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '(**) *****-****';
  const last4 = digits.slice(-4);
  return `(**) *****-${last4}`;
}

export function maskCustomerData<T extends { cnpj: string; email: string; phone: string }>(
  customer: T,
): T {
  return {
    ...customer,
    cnpj: maskCnpj(customer.cnpj),
    email: maskEmail(customer.email),
    phone: maskPhone(customer.phone),
  };
}
