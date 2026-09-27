import { authenticateDashboardJson } from '../utils/auth.js';
import { jsonResponse } from '../utils/http.js';

// POST /api/admin-auth-check
// Validates the dashboard (admin) Basic Auth credentials sent in the
// Authorization header (set by the custom admin login form). Returns
// 200 { ok: true } when the credentials are valid (or dashboard auth is
// disabled), and a 401 JSON error otherwise. Used by the admin login page so
// it can verify before storing the credential.
export async function onRequestPost(context) {
    const { request, env } = context;

    const result = authenticateDashboardJson(request, env);
    if (result === null) {
        return jsonResponse({ ok: true });
    }

    return result;
}
