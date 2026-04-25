export const SUPER_ADMIN_EMAIL = "morena.awdtech@gmail.com";

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}
