import { authenticateUploadJson } from '../utils/auth.js';
import { jsonResponse } from '../utils/http.js';

// POST /api/auth-check
// Validates the upload Basic Auth credentials sent in the Authorization header
// (set manually by the custom login form). Returns 200 { ok: true } when the
// credentials are valid (or uploads are public), and a 401 JSON error otherwise.
// Used by the homepage's custom login dialog so it can verify before storing.
export async function onRequestPost(context) {
    const { request, env } = context;

    const result = authenticateUploadJson(request, env);
    if (result === null) {
        return jsonResponse({ ok: true });
    }

    return result;
}
