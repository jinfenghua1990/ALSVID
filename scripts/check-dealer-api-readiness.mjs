import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/**
 * Read-only release gate for the public Dealer partnership API.
 * GET exercises its approved public_locations projection, including the migration.
 * Invalid POST proves the application route is present without writing any user data.
 */
export async function checkDealerApiReadiness(apiUrl, fetcher = fetch) {
  if (!apiUrl) throw new Error('ALSVID_API_URL is required');
  let base;
  try {
    base = new URL(apiUrl);
    if (base.protocol !== 'https:' || !base.hostname) throw new Error('HTTPS required');
  } catch {
    throw new Error('ALSVID_API_URL must be a valid HTTPS API service URL');
  }
  const url = base.href.replace(/\/$/, '');
  const options = { cache: 'no-store', signal: AbortSignal.timeout(12000) };
  let locationResponse;
  try {
    locationResponse = await fetcher(url + '/api/v1/public/dealer-locations?capability=sales', options);
  } catch {
    throw new Error('Public dealer location API cannot be reached');
  }
  if (locationResponse.status !== 200) {
    throw new Error('Dealer directory API is not ready (HTTP ' + locationResponse.status + '). Deploy API and migration 0032 first.');
  }
  let body;
  try { body = await locationResponse.json(); } catch { throw new Error('Dealer directory API returned non-JSON body'); }
  if (!body || typeof body !== 'object' || !Array.isArray(body.data)) {
    throw new Error('Dealer directory API returned an incompatible response');
  }
  // A malformed enquiry MUST be rejected without inserting an application.
  let invalidResponse;
  try {
    invalidResponse = await fetcher(url + '/api/v1/public/dealer-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new Error('Dealer application API cannot be reached');
  }
  if (invalidResponse.status !== 400) {
    throw new Error('Dealer application API contract mismatch (HTTP ' + invalidResponse.status + '). Do not deploy WWW before API.');
  }
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkDealerApiReadiness(process.env.ALSVID_API_URL)
    .then(() => { console.log('Dealer directory and application API are ready; migration and route contract verified.'); })
    .catch((error) => { console.error('::error title=Incompatible Dealer API::' + error.message); process.exitCode = 1; });
}
