import {
    basicAuthentication,
    dashboardDisabledResponse,
    authenticateDashboardJson,
} from "../../utils/auth.js";
import { isEmptyBinding, jsonResponse } from "../../utils/http.js";

async function errorHandling(context) {
    try {
      return await context.next();
    } catch (err) {
      return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
  }

  function authentication(context) {
    if (isEmptyBinding(context.env.img_url)) {
        return dashboardDisabledResponse();
    }

    const result = authenticateDashboardJson(context.request, context.env);
    if (result) {
        return result;
    }

    return context.next();
  }
  
  export const onRequest = [errorHandling, authentication];
