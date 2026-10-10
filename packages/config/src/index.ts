export type AppEnvironment = 'development' | 'test' | 'production';

export function requiredEnv(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name];
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
}

export function optionalEnv(name: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

export function integerEnv(name: string, fallback: number, env: NodeJS.ProcessEnv = process.env): number {
  const raw = optionalEnv(name, env);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

export interface PlatformConfig {
  environment: AppEnvironment;
  databaseUrl: string;
  apiPort: number;
  worker: {
    id: string;
    queue: string;
    pollMs: number;
    leaseMs: number;
  };
  objectStorage: {
    provider: string;
    bucket: string | null;
    endpoint: string | null;
  };
  ai: {
    provider: string | null;
    defaultModel: string | null;
  };
}

export function loadPlatformConfig(env: NodeJS.ProcessEnv = process.env): PlatformConfig {
  const rawEnvironment = (optionalEnv('NODE_ENV', env) ?? 'development') as AppEnvironment;
  if (!['development', 'test', 'production'].includes(rawEnvironment)) throw new Error('NODE_ENV must be development, test or production');
  return {
    environment: rawEnvironment,
    databaseUrl: requiredEnv('DATABASE_URL', env),
    apiPort: integerEnv('API_PORT', 4000, env),
    worker: {
      id: optionalEnv('WORKER_ID', env) ?? `worker-${process.pid}`,
      queue: optionalEnv('WORKER_QUEUE', env) ?? 'default',
      pollMs: integerEnv('WORKER_POLL_MS', 1000, env),
      leaseMs: integerEnv('WORKER_LEASE_MS', 300000, env),
    },
    objectStorage: {
      provider: optionalEnv('OBJECT_STORAGE_PROVIDER', env) ?? 's3-compatible',
      bucket: optionalEnv('OBJECT_STORAGE_BUCKET', env),
      endpoint: optionalEnv('OBJECT_STORAGE_ENDPOINT', env),
    },
    ai: {
      provider: optionalEnv('AI_PROVIDER', env),
      defaultModel: optionalEnv('AI_DEFAULT_MODEL', env),
    },
  };
}
