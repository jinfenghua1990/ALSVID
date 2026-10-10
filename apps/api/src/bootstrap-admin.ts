import { database, identityService } from './runtime.js';

const email = process.env.ALSVID_BOOTSTRAP_ADMIN_EMAIL;
const password = process.env.ALSVID_BOOTSTRAP_ADMIN_PASSWORD;
const displayName = process.env.ALSVID_BOOTSTRAP_ADMIN_NAME ?? 'ALSVID Administrator';

if (!email || !password) {
  console.error('ALSVID_BOOTSTRAP_ADMIN_EMAIL and ALSVID_BOOTSTRAP_ADMIN_PASSWORD are required');
  process.exitCode = 1;
} else {
  try {
    const userId = await identityService.bootstrapAdmin(email, password, displayName);
    console.log(`Bootstrap administrator ready: ${userId}`);
  } finally {
    await database.close();
  }
}
