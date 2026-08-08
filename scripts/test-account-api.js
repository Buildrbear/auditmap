const assert = require("node:assert/strict");

process.env.SUPABASE_URL = "https://auditmap-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

const handler = require("../api/account");

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

async function invoke({ method = "GET", body = {}, authorization = "Bearer user-token" } = {}) {
  const response = responseRecorder();
  await handler({ method, body, headers: { authorization } }, response);
  return response;
}

async function run() {
  const originalFetch = global.fetch;
  const requests = [];
  try {
    global.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (String(url).endsWith("/auth/v1/user")) {
        return new Response(JSON.stringify({ id: "11111111-1111-4111-8111-111111111111" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (options.method === "GET") {
        return new Response(JSON.stringify([{ place_id: "dix-park" }, { place_id: "lake-johnson" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(url).endsWith("/rest/v1/rpc/replace_user_saved_places")) {
        const ids = JSON.parse(options.body).saved_place_ids;
        return new Response(JSON.stringify(ids.map((place_id) => ({ place_id }))), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(null, { status: 204 });
    };

    const missingSession = await invoke({ authorization: "" });
    assert.equal(missingSession.statusCode, 401);

    const unsupportedMethod = await invoke({ method: "POST" });
    assert.equal(unsupportedMethod.statusCode, 405);

    const read = await invoke();
    assert.equal(read.statusCode, 200);
    assert.deepEqual(read.body.placeIds, ["dix-park", "lake-johnson"]);
    assert.match(requests[1].url, /user_saved_places\?select=place_id/);

    const invalid = await invoke({ method: "PUT", body: { placeIds: "dix-park" } });
    assert.equal(invalid.statusCode, 400);

    const replaced = await invoke({
      method: "PUT",
      body: {
        placeIds: ["dix-park", "dix-park", "lake-johnson", "bad id", "<script>"],
      },
    });
    assert.equal(replaced.statusCode, 200);
    assert.deepEqual(replaced.body.placeIds, ["dix-park", "lake-johnson"]);
    const replacement = requests.find((request) => request.url.endsWith("/rest/v1/rpc/replace_user_saved_places"));
    assert.deepEqual(JSON.parse(replacement.options.body), {
      saved_place_ids: ["dix-park", "lake-johnson"],
    });
    assert.equal(replacement.options.headers.Authorization, "Bearer user-token");

    console.log("Account saved-place API checks passed.");
  } finally {
    global.fetch = originalFetch;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
