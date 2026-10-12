import { SetMetadata } from '@nestjs/common';

export const PASSWORD_SETUP_ALLOWED = 'alsvid:password-setup-allowed';

/**
 * Allows an authenticated account that still owes mandatory password setup to
 * call a narrowly-scoped endpoint such as /me, /password or /logout.
 */
export const PasswordSetupAllowed = () => SetMetadata(PASSWORD_SETUP_ALLOWED, true);
