# Fix for RLS Error when Creating Client

The "Row-Level Security Policy" error occurs because your Admin user is not linked to any store. The system requires that a client belongs to a store you have access to.

**Solution:**
1.  Open the **Supabase Dashboard** > **SQL Editor**.
2.  Run the script located at: `grant_access_loja.sql` (in your project root).
3.  This script will:
    - Find or create a default "Loja Matriz".
    - Grant you access to it.
    - Set it as your default store.

After running the script, try creating the client again.
