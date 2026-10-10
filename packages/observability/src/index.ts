export type LogFields = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
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

  private write(level: string, message: string, fields: LogFields): void {
    const record = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...this.base, ...fields });
    if (level === 'error') console.error(record);
    else if (level === 'warn') console.warn(record);
    else console.log(record);
  }
}
