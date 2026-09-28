import { isEmptyBinding, jsonResponse } from '../utils/http.js';
import { isShortUrlsEnabled } from '../utils/shortlink.js';
import { getSetupStatus } from '../utils/setup-status.js';
import { getAllowedUploadCredentials } from '../utils/auth.js';

// Public, non-sensitive site configuration for the frontend. Any static UI can
// read this once at startup instead of the deployment having to edit HTML.
export async function onRequestGet(context) {
    const { env } = context;
    const setup = getSetupStatus(env);

    return jsonResponse({
        siteName: env.SITE_NAME || '涯木云',
        siteTitle: env.SITE_TITLE || env.SITE_NAME || '涯木云',
        backgroundImage: env.SITE_BACKGROUND || '',
        enableShortUrls: isShortUrlsEnabled(env),
        uploadRequiresAuth: getAllowedUploadCredentials(env).pairs.length > 0,
        showAdminEntry: env.HIDE_ADMIN_ENTRY !== 'true',
        // Deployment self-check so a misconfigured site says so instead of
        // failing silently on the first upload. Enum status only, no values.
        ready: setup.ready,
        setup: setup.checks,
        problems: setup.problems,
    }, {
        // Config is static per deploy (derived from env), so cache it at the
        // edge. This collapses the per-page-load Function call into one miss
        // per POP per CONFIG_CACHE_TTL window instead of one per visitor.
        headers: { 'Cache-Control': 'public, max-age=600' },
    });
}
