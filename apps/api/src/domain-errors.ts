/**
 * Temporary controller compatibility helper.
 *
 * Domain-to-HTTP mapping is centralized in DomainExceptionFilter. Existing
 * controllers may keep their small try/catch blocks while they are simplified,
 * but this helper no longer knows about individual Domain error classes.
 */
export function throwHttpDomainError(error: unknown): never {
  throw error;
}
