const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STATE_ROW_ID = process.env.STATE_ROW_ID || "main";

function json(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
}

async function supabaseFetch(path, options = {}) {
  assertConfigured();
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${detail}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

module.exports = async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const rows = await supabaseFetch(
        `/rest/v1/dashboard_state?id=eq.${encodeURIComponent(STATE_ROW_ID)}&select=data`,
      );
      json(response, 200, { state: rows?.[0]?.data || null });
      return;
    }

    if (request.method === "PUT" || request.method === "POST") {
      const body = request.body || {};
      if (!body.state || typeof body.state !== "object") {
        json(response, 400, { error: "Missing state object" });
        return;
      }

      await supabaseFetch("/rest/v1/dashboard_state?on_conflict=id", {
        method: "POST",
        headers: {
          prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: STATE_ROW_ID,
          data: body.state,
          updated_at: new Date().toISOString(),
        }),
      });

      json(response, 200, { ok: true });
      return;
    }

    response.setHeader("Allow", "GET, PUT, POST");
    json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    json(response, 503, {
      error: "Shared state unavailable",
      detail: error.message,
    });
  }
};
