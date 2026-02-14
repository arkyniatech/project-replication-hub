// RH Module Exports
export { getRhRoutes } from './routes';
export { getRhMenuItems } from './menu';
export { RhModuleProvider } from './providers/RhModuleProvider';
export { RhModuleLayout } from './layouts/RhModuleLayout';

// Types
export * from './types';

// Constants
export const RH_MODULE_CONFIG = {
  IS_MODULE: true,
  USE_SUPABASE: false,
  BASE_PATH: '/rh'
} as const;