import { vi, beforeEach, afterEach } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';

let mockSupabaseClient: SupabaseClient;

beforeEach(() => {
  mockSupabaseClient = {
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockReturnValue({
            toJSON: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
    })),
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ user: null, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: null, error: null })
    },
    storage: {
      from: vi.fn((bucket) => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    }
  };

  vi.resetModules();
  vi.doMock('@/integrations/supabase/client', () => ({ default: mockSupabaseClient }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

export default mockSupabaseClient;