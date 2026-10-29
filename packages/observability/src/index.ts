export type LogFields = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

// Cloud Logging reads `severity`; an unrecognised `level` field leaves every
// record at INFO, which hides warnings and failures in the console.
const SEVERITY = { debug: 'DEBUG', info: 'INFO', warn: 'WARNING', error: 'ERROR' } as const;

type Level = keyof typeof SEVERITY;

/** Expands a thrown value so the JSON record keeps the stack Cloud Logging needs. */
function expandError(fields: LogFields): LogFields {
  const error = fields.error;
  if (!(error instanceof Error)) return fields;
  return { ...fields, error: error.message, errorType: error.name, stack: error.stack };
}

export class JsonConsoleLogger implements Logger {
  constructor(private readonly base: LogFields = {}) {}

  child(fields: LogFields): Logger {
    return new JsonConsoleLogger({ ...this.base, ...fields });
  }

  debug(message: string, fields: LogFields = {}): void { this.write('debug', message, fields); }
  info(message: string, fields: LogFields = {}): void { this.write('info', message, fields); }
  warn(message: string, fields: LogFields = {}): void { this.write('warn', message, fields); }
  error(message: string, fields: LogFields = {}): void { this.write('error', message, fields); }

  private write(level: Level, message: string, fields: LogFields): void {
    const record = JSON.stringify({
      timestamp: new Date().toISOString(),
      severity: SEVERITY[level],
      message,
      ...this.base,
      ...expandError(fields),
    });
    if (level === 'error') console.error(record);
    else if (level === 'warn') console.warn(record);
    else console.log(record);
  }
}
