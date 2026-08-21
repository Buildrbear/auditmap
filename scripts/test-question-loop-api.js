const assert = require("node:assert/strict");

function installModuleMock(modulePath, exports) {
  const filename = require.resolve(modulePath);
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  };
}

function responseHarness() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

const root = require("node:path").resolve(__dirname, "..");
const supabasePath = `${root}/api/_lib/supabase.js`;
const authPath = `${root}/api/_lib/account-auth.js`;
const abusePath = `${root}/api/_lib/abuse-controls.js`;
const informationNeedsPath = `${root}/api/_lib/information-needs.js`;
const aiConnectionPath = `${root}/api/_lib/ai-connection.js`;

const state = {
  mode: "followups",
  patches: [],
  currentNeed: null,
};
const place = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  public_id: "dix-park",
  name: "Dix Park",
  type: "Park",
  city: "Raleigh",
  state: "NC",
};
const needId = "11111111-1111-4111-8111-111111111111";
const approvedNeed = {
  id: needId,
  institution_id: place.id,
  sample_question: "Where should I park?",
  ask_count: 3,
  status: "answered",
  answer_status: "answered",
  intent_key: "parking",
  canonical_answer: "Use the marked visitor lots near your destination.",
  answer_sources: [{ title: "Official visitor guide", url: "https://dixpark.org/visit", sourceType: "official" }],
  answered_at: "2026-08-07T12:00:00.000Z",
  expires_at: "2026-08-14T12:00:00.000Z",
  metadata: { followUpStatus: "queued", followUpReadyAt: "2026-08-07T12:00:00.000Z" },
};

async function supabaseRequest(query, options = {}) {
  if (query.startsWith("institutions?")) return [place];
  if (state.mode === "ask") {
    if (query.startsWith("contributions?")) return [];
    if (query.startsWith("place_facts?")) return [];
    if (query.startsWith("information_needs?institution_id=")) return [];
    if (query === "rpc/record_information_need") {
      return [{
        id: needId,
        institution_id: place.id,
        question_key: "parking-key",
        sample_question: "Where should I park?",
        ask_count: 1,
        status: "open",
        metadata: {},
      }];
    }
  }
  if (query.startsWith("information_needs?status=eq.answered")) return [approvedNeed];
  if (query.startsWith(`information_needs?id=eq.${needId}`) && options.method === "GET") {
    return state.currentNeed ? [state.currentNeed] : [];
  }
  if (query.startsWith(`information_needs?id=eq.${needId}`) && options.method === "PATCH") {
    const patch = JSON.parse(options.body);
    state.patches.push(patch);
    return [{ ...(state.currentNeed || approvedNeed), ...patch }];
  }
  throw new Error(`Unexpected synthetic Supabase request: ${options.method || "GET"} ${query}`);
}

installModuleMock(supabasePath, {
  databaseConfig: () => ({ url: "https://synthetic.invalid", serviceKey: "synthetic" }),
  databaseReady: () => true,
  supabaseRequest,
});
installModuleMock(authPath, {
  authenticatedUser: async () => ({ user: { id: "moderator-user", app_metadata: { role: "moderator" } } }),
  trustedRole: () => "moderator",
});
installModuleMock(abusePath, {
  assertSameOrigin: () => {},
  enforceRateLimit: () => {},
  requestFingerprint: () => "synthetic-request",
  requireFeature: () => {},
});

async function testModerationFlow() {
  const moderationPath = `${root}/api/moderation.js`;
  delete require.cache[require.resolve(moderationPath)];
  const moderation = require(moderationPath);

  state.mode = "followups";
  let response = responseHarness();
  await moderation({ method: "GET", query: { status: "followups" }, headers: {} }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.followUps.length, 1);
  assert.equal(response.payload.followUps[0].place.public_id, "dix-park");
  assert.ok(response.payload.followUps[0].caption.includes("#AnsweredByAuditMap"));

  state.currentNeed = { ...approvedNeed, status: "open", answer_status: "needs_verification", answer_sources: [] };
  response = responseHarness();
  await moderation({
    method: "POST",
    query: {},
    headers: {},
    body: { resourceType: "informationNeed", id: needId, action: "answered" },
  }, response);
  assert.equal(response.statusCode, 409);
  assert.match(response.payload.error, /public source/);

  state.patches = [];
  state.currentNeed = { ...approvedNeed, status: "open", answer_status: "needs_verification" };
  response = responseHarness();
  await moderation({
    method: "POST",
    query: {},
    headers: {},
    body: { resourceType: "informationNeed", id: needId, action: "answered" },
  }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(state.patches[0].status, "answered");
  assert.equal(state.patches[0].answer_status, "answered");
  assert.equal(state.patches[0].metadata.followUpStatus, "queued");

  state.patches = [];
  state.currentNeed = approvedNeed;
  response = responseHarness();
  await moderation({
    method: "POST",
    query: {},
    headers: {},
    body: { resourceType: "informationNeed", id: needId, action: "followup_prepared" },
  }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(state.patches[0].metadata.followUpStatus, "prepared");
}

async function testAskDraftFlow() {
  installModuleMock(informationNeedsPath, {
    syncInformationNeed: async (record) => record,
  });
  installModuleMock(aiConnectionPath, {
    resolveAiConnection: async () => ({
      apiUrl: "https://synthetic.openai.invalid/responses",
      token: "synthetic-token",
      model: "synthetic-model",
    }),
  });
  const askPath = `${root}/api/ask.js`;
  delete require.cache[require.resolve(askPath)];
  const ask = require(askPath);
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      output_text: "Use the marked visitor lots near your exact Dix Park destination. Check current park signs before leaving.",
    }),
  });
  state.mode = "ask";
  state.patches = [];
  state.currentNeed = null;
  const response = responseHarness();
  try {
    await ask({
      method: "POST",
      headers: {},
      body: {
        question: "Where should I park at Dix Park?",
        places: [{
          id: "dix-park",
          name: "Dix Park",
          type: "Park",
          city: "Raleigh",
          state: "NC",
          address: "1030 Richardson Drive",
          url: "/us/nc/raleigh/parks/dix-park",
          officialCatalog: [{
            key: "parking",
            label: "Parking",
            value: "Use marked visitor lots near the selected destination.",
            scope: "place",
            sourceLabel: "Dix Park visitor guide",
            sourceUrl: "https://dixpark.org/visit",
            checkedAt: "2026-08-07",
            sourceType: "official",
            verificationStatus: "verified",
          }],
        }],
      },
    }, response);
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.mode, "ai");
  assert.match(response.payload.answer, /marked visitor lots/);
  assert.equal(response.payload.informationNeedRecorded, true);
  const draftPatch = state.patches.find((patch) => patch.canonical_answer);
  assert.ok(draftPatch);
  assert.equal(draftPatch.answer_status, "needs_verification");
  assert.equal(draftPatch.status, "open");
  assert.equal(draftPatch.answered_at, null);
  assert.equal(draftPatch.metadata.aiDraft.model, "synthetic-model");
}

(async () => {
  await testModerationFlow();
  await testAskDraftFlow();
  console.log("Ask draft, sourced moderation, and follow-up API integration checks passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
