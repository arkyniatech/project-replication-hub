/**
 * Logger centralizado que remove logs sensíveis em produção
 * e previne vazamento de informações via console
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  context?: string;
  metadata?: Record<string, unknown>;
}

const isDev = import.meta.env.DEV;

/**
 * Sanitiza erro para não expor informações sensíveis
 */
function sanitizeError(error: unknown): string {
  if (!isDev) {
    return 'Internal error. Contact support.';
  }
  
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  
  return String(error);
}

/**
 * Logger seguro que remove logs em produção
 */
export const logger = {
  info: (message: string, options?: LogOptions) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, options?.metadata || '');
    }
  },

  warn: (message: string, options?: LogOptions) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, options?.metadata || '');
    }
  },

  error: (message: string, error?: unknown, options?: LogOptions) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, error, options?.metadata || '');
    } else {
      // Em produção, poderia enviar para Sentry/LogRocket
      // Por ora, silenciosamente ignora para não vazar dados
    }
  },

  debug: (message: string, data?: unknown) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
};

/**
 * Hook para toast de erro user-friendly (sem expor detalhes técnicos)
 */
export function getErrorMessage(error: unknown): string {
  if (!isDev) {
    return 'Ocorreu um erro. Por favor, contate o suporte.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Erro desconhecido';
}
