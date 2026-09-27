import sentryPlugin from "@cloudflare/pages-plugin-sentry";
import '@sentry/tracing';

// Telemetry (Sentry) is OFF by default. It only runs when explicitly opted in
// via ENABLE_TELEMETRY=true. The previous default shipped telemetry ON and
// pointed at the upstream author's Sentry project; we no longer report by
// default and never send to a hardcoded third-party DSN.
function telemetryEnabled(env) {
  if (env.ENABLE_TELEMETRY === 'true') return true;   // explicit opt-in
  if (env.disable_telemetry === 'true') return false; // explicit opt-out
  return false;                                        // default: off
}

export async function errorHandling(context) {
  const env = context.env;
  if (telemetryEnabled(env)) {
    context.data.telemetry = true;
    let remoteSampleRate = 0.001;
    try {
      const sampleRate = await fetchSampleRate(context)
      console.log("sampleRate", sampleRate);
      //check if the sample rate is not null
      if (sampleRate) {
        remoteSampleRate = sampleRate;
      }
    } catch (e) { console.log(e) }
    const sampleRate = env.sampleRate || remoteSampleRate;
    console.log("sampleRate", sampleRate);
    const dsn = env.SENTRY_DSN;
    if (!dsn) {
      // Opted in but no DSN configured: skip rather than report to a default.
      return context.next();
    }
    return sentryPlugin({
      dsn,
      tracesSampleRate: sampleRate,
    })(context);
  }
  return context.next();
}

export function telemetryData(context) {
  const env = context.env;
  if (telemetryEnabled(env)) {
    try {
      const parsedHeaders = {};
      context.request.headers.forEach((value, key) => {
        parsedHeaders[key] = value
        //check if the value is empty
        if (value.length > 0) {
          context.data.sentry.setTag(key, value);
        }
      });
      const CF = JSON.parse(JSON.stringify(context.request.cf));
      const parsedCF = {};
      for (const key in CF) {
        if (typeof CF[key] == "object") {
          parsedCF[key] = JSON.stringify(CF[key]);
        } else {
          parsedCF[key] = CF[key];
          if (CF[key].length > 0) {
            context.data.sentry.setTag(key, CF[key]);
          }
        }
      }
      const data = {
        headers: parsedHeaders,
        cf: parsedCF,
        url: context.request.url,
        method: context.request.method,
        redirect: context.request.redirect,
      }
      //get the url path
      const urlPath = new URL(context.request.url).pathname;
      const hostname = new URL(context.request.url).hostname;
      context.data.sentry.setTag("path", urlPath);
      context.data.sentry.setTag("url", data.url);
      context.data.sentry.setTag("method", context.request.method);
      context.data.sentry.setTag("redirect", context.request.redirect);
      context.data.sentry.setContext("request", data);
      const transaction = context.data.sentry.startTransaction({ name: `${context.request.method} ${hostname}` });
      //add the transaction to the context
      context.data.transaction = transaction;
      return context.next();
    } catch (e) {
      console.log(e);
    } finally {
      context.data.transaction.finish();
    }
  }
  return context.next();
}

export async function traceData(context, span, op, name) {
  const data = context.data
  if (data.telemetry) {
    if (span) {
      console.log("span finish")
      span.finish();
    } else {
      console.log("span start")
      span = await context.data.transaction.startChild(
        { op: op, name: name },
      );
    }
  }
}

async function fetchSampleRate(context) {
  const data = context.data
  // Only reach out to a samplerate endpoint you control (env-provided).
  if (data.telemetry && context.env.SENTRY_SAMPLERATE_URL) {
    const url = context.env.SENTRY_SAMPLERATE_URL;
    const response = await fetch(url);
    const json = await response.json();
    return json.rate;
  }
}