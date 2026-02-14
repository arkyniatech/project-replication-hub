import { supabase } from '@/integrations/supabase/client';

export interface LogDetails {
    [key: string]: any;
}

/**
 * Logs a system action to the database
 * @param action The name of the action (e.g., 'LOGIN', 'LOGOUT', 'USER_CREATED')
 * @param details Additional data about the action
 * @param userId Optional user ID (if not provided, tries to get from current session)
 */
export async function logAction(action: string, details: LogDetails = {}, userId?: string) {
    try {
        let currentUserId = userId;

        if (!currentUserId) {
            // Try to get from Supabase (if using Supabase Auth)
            const { data: { user } } = await supabase.auth.getUser();
            currentUserId = user?.id;
        }

        // Note: With Auth0, we might pass the Auth0 Sub as userId directly when calling this function

        // Insert into Supabase table
        const { error } = await (supabase
            .from('system_logs' as any) as any)
            .insert({
                user_id: currentUserId || 'anonymous',
                action,
                details,
                // ip_address is hard to get reliably on client-side without a backend proxy or Edge Function
                // We will rely on Supabase to potentially capture request headers if needed, 
                // or just accept it's client-reported.
            });

        if (error) {
            console.error('Failed to log action:', error);
        }
    } catch (err) {
        console.error('Error logging action:', err);
    }
}
