import { isEmptyBinding, jsonResponse, textResponse } from './http.js';

export const DASHBOARD_DISABLED_MESSAGE = 'Dashboard is disabled. Please bind a KV namespace to use this feature.';
export const BASIC_AUTH_CHALLENGE = 'Basic realm="需要密码请联系 me@nickyam.com", charset="UTF-8"';

export function basicAuthentication(request) {
  const authorization = request.headers.get('Authorization') || '';
  const [scheme, encoded] = authorization.split(' ');

  if (!encoded || scheme !== 'Basic') {
    return badRequestResponse('Malformed authorization header.');
  }

  const buffer = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  const decoded = new TextDecoder().decode(buffer).normalize();
  const index = decoded.indexOf(':');

  if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
    return badRequestResponse('Invalid authorization value.');
  }

  return {
    user: decoded.substring(0, index),
    pass: decoded.substring(index + 1),
  };
}

export function dashboardDisabledResponse() {
  return textResponse(DASHBOARD_DISABLED_MESSAGE, { status: 200 });
}

export function basicAuthChallengeResponse() {
  return textResponse('You need to login.', {
    status: 401,
    headers: {
      'WWW-Authenticate': BASIC_AUTH_CHALLENGE,
    },
  });
}

export function unauthorizedResponse(reason) {
  return textResponse(reason, {
    status: 401,
    statusText: 'Unauthorized',
    headers: plainTextHeaders(reason),
  });
}

function badRequestResponse(reason) {
  return textResponse(reason, {
    status: 400,
    statusText: 'Bad Request',
    headers: plainTextHeaders(reason),
  });
}

function plainTextHeaders(reason) {
  return {
    'Content-Type': 'text/plain;charset=UTF-8',
    'Cache-Control': 'no-store',
    'Content-Length': new TextEncoder().encode(reason).length,
  };
}

// JSON variant used by the upload endpoint so the frontend can render a custom
// login form instead of the browser's native Basic Auth dialog. Returns null
// when allowed, or a JSON Response (without the WWW-Authenticate header) on
// failure so no native prompt is triggered.
export function authenticateUploadJson(request, env) {
  const hasUser = !isEmptyBinding(env.UPLOAD_BASIC_USER);
  const hasPass = !isEmptyBinding(env.UPLOAD_BASIC_PASS);

  if (!hasUser && !hasPass) {
    return null;
  }

  if (!hasUser || !hasPass) {
    return jsonResponse(
      { error: 'UPLOAD_BASIC_USER 和 UPLOAD_BASIC_PASS 必须同时配置才能启用上传保护' },
      { status: 500 }
    );
  }

  if (!request.headers.has('Authorization')) {
    return jsonResponse({ error: '需要登录后才能上传', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const credentials = basicAuthentication(request);
  if (credentials instanceof Response) {
    return jsonResponse({ error: 'Authorization 格式错误' }, { status: 400 });
  }

  if (env.UPLOAD_BASIC_USER !== credentials.user || env.UPLOAD_BASIC_PASS !== credentials.pass) {
    return jsonResponse({ error: '用户名或密码错误' }, { status: 401 });
  }

  return null;
}
