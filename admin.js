const accessSection = document.querySelector("#review-access");
const workspace = document.querySelector("#review-workspace");
const tokenInput = document.querySelector("#review-token");
const accessStatus = document.querySelector("#review-access-status");
const reviewList = document.querySelector("#review-list");
const reviewCount = document.querySelector("#review-count");
const reviewEmpty = document.querySelector("#review-empty");
let reviewToken = sessionStorage.getItem("auditmap-review-token") || "";
let reviewFilter = "pending";

function accountSessionToken() {
  try {
    const session = JSON.parse(
      sessionStorage.getItem("auditmap:account-session") ||
      localStorage.getItem("auditmap:account-session") ||
      "null",
    );
    return session?.accessToken || "";
  } catch {
    return "";
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function contributionLabel(type) {
  return {
    observation: "Local update",
    review: "Review",
    correction: "Correction",
    confirmation: "Confirmation",
    question: "Question",
  }[type] || "Contribution";
}

async function moderationRequest(path = "", options = {}) {
  const response = await fetch(`./api/moderation${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${reviewToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "The review inbox could not be loaded.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function renderContribution(item) {
  const place = item.place || {};
  const submitted = new Date(item.created_at).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const source = item.source_url
    ? `<a class="review-source" href="${escapeHtml(item.source_url)}" target="_blank" rel="noreferrer">Open source ↗</a>`
    : `<span class="review-source is-missing">No source attached</span>`;
  const rating = item.rating
    ? `<span class="review-stars" aria-label="${Number(item.rating)} out of 5 stars">${"★".repeat(Math.round(Number(item.rating)))}</span>`
    : "";
  const aiReview = item.metadata?.aiModeration;
  const demoLabel = item.metadata?.demoSeed
    ? '<span class="review-demo-label">Demo activity</span>'
    : "";
  const media = Array.isArray(item.media) ? item.media : [];
  const mediaPanel = media.length
    ? `<div class="review-media-grid">
        ${media.map((asset) => `
          <a href="${escapeHtml(asset.review_url)}" target="_blank" rel="noreferrer" class="review-media-item">
            <img src="${escapeHtml(asset.review_url)}" alt="${escapeHtml(asset.alt_text || "Contribution media")}" />
            <span>${escapeHtml(asset.media_kind === "photo_360" ? "360°" : asset.media_kind)} · ${Number(asset.width || 0)}×${Number(asset.height || 0)}</span>
            <small>${Math.round(Number(asset.byte_size || 0) / 1024 / 1024 * 10) / 10} MB · metadata stripped: ${asset.metadata?.clientSanitized ? "client check" : "unconfirmed"}${asset.duplicate_count ? ` · ${asset.duplicate_count} published match${asset.duplicate_count === 1 ? "" : "es"}` : " · no published duplicate"}</small>
          </a>
        `).join("")}
      </div>`
    : "";
  const location = item.latitude != null && item.longitude != null
    ? `<span>Pin ${Number(item.latitude).toFixed(5)}, ${Number(item.longitude).toFixed(5)}</span>`
    : `<span>${escapeHtml(item.location_scope || "place")} level</span>`;
  const aiPanel = aiReview
    ? `<div class="review-ai is-${escapeHtml(aiReview.decision)}">
        <span>AI recommends ${escapeHtml(aiReview.decision)}</span>
        <strong>${Math.round(Number(aiReview.confidence || 0) * 100)}%</strong>
        <p>${escapeHtml(aiReview.summary || "No explanation supplied.")}</p>
      </div>`
    : `<div class="review-ai is-pending"><span>Not yet analyzed</span></div>`;
  const decisions =
    item.moderation_status === "pending"
      ? `<button class="submit-button" type="button" data-review-action="publish">${media.length ? "Approve all" : "Publish"}</button>
         ${media.length ? '<button class="outline-button" type="button" data-review-action="publish_text">Publish text only</button>' : ""}
         <button class="outline-button is-danger" type="button" data-review-action="reject">${media.length ? "Reject all" : "Reject"}</button>
         <button class="outline-button" type="button" data-review-action="analyze">Run AI review</button>`
      : item.moderation_status === "published"
        ? `<button class="outline-button" type="button" data-review-action="pending">Return to review</button>
           <button class="outline-button is-danger" type="button" data-review-action="reject">Remove</button>`
        : `<button class="submit-button" type="button" data-review-action="publish">Publish anyway</button>
           <button class="outline-button" type="button" data-review-action="pending">Return to review</button>`;
  return `
    <article class="review-item" data-review-id="${escapeHtml(item.id)}">
      <div class="review-item-heading">
        <div>
          <p class="review-place">${escapeHtml(place.name || "Unknown place")}</p>
          <p class="review-meta">${escapeHtml(contributionLabel(item.contribution_type))} · ${escapeHtml(submitted)} ${demoLabel}</p>
        </div>
        <a class="review-place-link" href="./place.html?id=${encodeURIComponent(place.public_id || "")}" target="_blank">View place ↗</a>
      </div>
      <blockquote>${escapeHtml(item.body)}</blockquote>
      ${mediaPanel}
      ${aiPanel}
      <div class="review-evidence">
        ${rating}
        ${source}
        <span>By ${escapeHtml(item.author_name || "Local contributor")}</span>
        ${location}
      </div>
      <label class="review-note">
        Private review note
        <textarea placeholder="Optional reason or context"></textarea>
      </label>
      <p class="form-status" data-review-status role="status"></p>
      <div class="review-decisions">
        ${decisions}
      </div>
    </article>
  `;
}

function renderInformationNeed(item) {
  const place = item.place || {};
  const sources = Array.isArray(item.answer_sources)
    ? item.answer_sources.filter((source) => source?.url)
    : [];
  const draft = item.canonical_answer
    ? `<div class="review-ai is-pending"><span>AI-assisted draft · human approval required</span><strong>${escapeHtml(item.answer_status === "needs_verification" ? "Needs verification" : "Draft answer")}</strong><p>${escapeHtml(item.canonical_answer)}</p></div>`
    : '<div class="review-ai is-pending"><span>Unanswered</span><strong>Research still needed</strong><p>No source-backed draft is available yet.</p></div>';
  const sourceLinks = sources.length
    ? `<div class="review-evidence">${sources.map((source) => `<a class="review-source" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Inspect ${escapeHtml(source.title || "source")} ↗</a>`).join("")}</div>`
    : '<div class="review-evidence"><span class="review-source is-missing">No public source attached</span></div>';
  return `
    <article class="review-item information-need" data-review-id="${escapeHtml(item.id)}" data-review-kind="informationNeed">
      <div class="review-item-heading">
        <div>
          <p class="review-place">${escapeHtml(place.name || "Unknown place")}</p>
          <p class="review-meta">Information gap · Asked ${Number(item.ask_count || 1)} ${Number(item.ask_count) === 1 ? "time" : "times"}</p>
        </div>
        <a class="review-place-link" href="./place.html?id=${encodeURIComponent(place.public_id || "")}" target="_blank">View place ↗</a>
      </div>
      <blockquote>${escapeHtml(item.sample_question)}</blockquote>
      ${draft}
      ${sourceLinks}
      <p class="form-status" data-review-status role="status"></p>
      <div class="review-decisions">
        ${item.canonical_answer && sources.length ? '<button class="submit-button" type="button" data-review-action="answered">Approve sourced answer</button>' : ""}
        <button class="outline-button" type="button" data-review-action="dismissed">Dismiss</button>
      </div>
    </article>
  `;
}

function renderFollowUp(item) {
  const sources = Array.isArray(item.sources) ? item.sources : [];
  return `
    <article class="review-item information-need" data-review-id="${escapeHtml(item.id)}" data-review-kind="informationNeed">
      <div class="review-item-heading">
        <div><p class="review-place">${escapeHtml(item.place?.name || "Unknown place")}</p><p class="review-meta">Answered visitor question · follow-up ready</p></div>
        <a class="review-place-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">View answer ↗</a>
      </div>
      <blockquote>${escapeHtml(item.question)}</blockquote>
      <label class="review-note">Social draft<textarea data-followup-caption readonly>${escapeHtml(item.caption)}</textarea></label>
      <div class="review-evidence">
        ${sources.map((source) => `<a class="review-source" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Inspect ${escapeHtml(source.title || "source")} ↗</a>`).join("")}
        <span>${Number(item.estimatedXLength || 0)}/280 estimated characters</span>
      </div>
      <p class="form-status" data-review-status role="status"></p>
      <div class="review-decisions">
        <button class="outline-button" type="button" data-copy-followup>Copy draft</button>
        <button class="submit-button" type="button" data-review-action="followup_prepared">Mark prepared</button>
      </div>
    </article>
  `;
}

function renderEnrichmentFact(item) {
  const place = item.place || {};
  const isSearchOpportunity = item.predicate === "search-opportunity";
  const answer = item.value?.text || item.value?.angle || JSON.stringify(item.value || {});
  const question = item.value?.question || item.job?.input_snapshot?.researchTask?.question;
  const source = isSearchOpportunity
    ? '<span class="review-source">Planning hypothesis · evidence required before public claims</span>'
    : item.source
    ? `<a class="review-source" href="${escapeHtml(item.source.url)}" target="_blank" rel="noreferrer">Inspect ${escapeHtml(item.source.label || "source")} ↗</a>`
    : `<span class="review-source is-missing">No source attached</span>`;
  const confidence = Math.round(Number(item.confidence || 0) * 100);
  const validUntil = item.valid_until
    ? ` · Recheck by ${new Date(item.valid_until).toLocaleDateString()}`
    : "";
  return `
    <article class="review-item enrichment-fact" data-review-id="${escapeHtml(item.id)}" data-review-kind="enrichmentFact">
      <div class="review-item-heading">
        <div>
          <p class="review-place">${escapeHtml(place.name || "Unknown place")}</p>
          <p class="review-meta">${isSearchOpportunity ? "AI-proposed search opportunity" : `AI-proposed fact · ${escapeHtml(item.predicate)}`} · ${confidence}% confidence${escapeHtml(validUntil)}</p>
        </div>
        <a class="review-place-link" href="./place.html?id=${encodeURIComponent(place.public_id || "")}" target="_blank">View place ↗</a>
      </div>
      ${question ? `<p class="review-question">${escapeHtml(question)}</p>` : ""}
      <blockquote>${escapeHtml(answer)}</blockquote>
      ${
        isSearchOpportunity
          ? `<div class="review-evidence">
              <span><strong>Visitor value:</strong> ${escapeHtml(item.value?.visitorValue || "Not supplied")}</span>
              <span><strong>Official coverage gap:</strong> ${escapeHtml(item.value?.officialCoverageGap || "Not supplied")}</span>
              <span><strong>Evidence plan:</strong> ${escapeHtml(item.value?.evidencePlan || "Not supplied")}</span>
              <span><strong>Opportunity type:</strong> ${escapeHtml(item.value?.opportunityType || "Not supplied")}</span>
            </div>`
          : ""
      }
      <div class="review-ai is-pending">
        <span>${isSearchOpportunity ? "Editorial review required" : "Human verification required"}</span>
        <strong>${escapeHtml(item.job?.model || "AI draft")}</strong>
        <p>${isSearchOpportunity ? "Approve only when the question is useful and distinct. Complete the evidence plan before publishing any resulting claim." : "Read the linked source and confirm that it directly supports this wording before accepting."}</p>
      </div>
      <div class="review-evidence">
        ${source}
        <span>Observed ${new Date(item.observed_at || item.created_at).toLocaleDateString()}</span>
      </div>
      <p class="form-status" data-review-status role="status"></p>
      <div class="review-decisions">
        <button class="submit-button" type="button" data-review-action="accept" ${item.source || isSearchOpportunity ? "" : "disabled"}>${isSearchOpportunity ? "Approve opportunity" : "Accept sourced fact"}</button>
        <button class="outline-button is-danger" type="button" data-review-action="reject">Reject draft</button>
      </div>
    </article>
  `;
}

function renderVerificationClaim(item) {
  const place = item.place || {};
  const contribution = item.contribution || {};
  const intent = String(item.predicate || "").replace(/^answer:/, "");
  const observed = item.value?.observedAt || contribution.created_at || item.extracted_at;
  const source = contribution.source_url
    ? `<a class="review-source" href="${escapeHtml(contribution.source_url)}" target="_blank" rel="noreferrer">Inspect attached source ↗</a>`
    : `<span class="review-source is-missing">Firsthand report without attached source</span>`;
  return `
    <article class="review-item verification-claim" data-review-id="${escapeHtml(item.id)}" data-review-kind="verificationClaim">
      <div class="review-item-heading">
        <div>
          <p class="review-place">${escapeHtml(place.name || "Unknown place")}</p>
          <p class="review-meta">Visitor evidence · ${escapeHtml(intent)} · ${Math.round(Number(item.confidence || 0) * 100)}% initial confidence</p>
        </div>
        <a class="review-place-link" href="./place.html?id=${encodeURIComponent(place.public_id || "")}&verify=${encodeURIComponent(intent)}" target="_blank">View task ↗</a>
      </div>
      <p class="review-question">${escapeHtml(contribution.metadata?.verificationPrompt || `Verify ${intent}`)}</p>
      <blockquote>${escapeHtml(item.claim_text)}</blockquote>
      <div class="review-ai is-pending">
        <span>Factual review required</span>
        <strong>Not a public fact yet</strong>
        <p>${escapeHtml(contribution.metadata?.evidenceRequest || "Check whether this observation is specific, recent, and supported before accepting it as evidence.")}</p>
      </div>
      <div class="review-evidence">
        ${source}
        <span>By ${escapeHtml(contribution.author_name || "Local visitor")}</span>
        <span>Observed ${new Date(observed).toLocaleDateString()}</span>
      </div>
      <p class="form-status" data-review-status role="status"></p>
      <div class="review-decisions">
        <button class="submit-button" type="button" data-review-action="accept">Accept as evidence</button>
        <button class="outline-button is-danger" type="button" data-review-action="reject">Reject evidence</button>
      </div>
    </article>
  `;
}

function renderReport(item) {
  const place = item.place || {};
  const submitted = new Date(item.created_at).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const fallback = String(item.reason || "").match(/^\[([^\]]+)\]\s*([^:]+):\s*(.*)$/);
  const reason = fallback?.[2] || item.reason || "other";
  const details = item.details || fallback?.[3] || "No additional details supplied.";
  const target = item.target_type || (fallback?.[1]?.startsWith("contribution") ? "contribution" : "place");
  return `
    <article class="review-item safety-report" data-review-id="${escapeHtml(item.id)}" data-review-kind="report">
      <div class="review-item-heading">
        <div>
          <p class="review-place">${escapeHtml(place.name || "Unknown place")}</p>
          <p class="review-meta">${escapeHtml(reason)} report · ${escapeHtml(target)} · ${escapeHtml(submitted)}</p>
        </div>
        <a class="review-place-link" href="./place.html?id=${encodeURIComponent(place.public_id || "")}" target="_blank">View place ↗</a>
      </div>
      <blockquote>${escapeHtml(details)}</blockquote>
      <div class="review-ai is-pending">
        <span>Community safety review</span>
        <strong>Private report</strong>
        <p>Inspect the public item and context before taking action. Suspension immediately removes the account’s ability to contribute.</p>
      </div>
      <p class="form-status" data-review-status role="status"></p>
      <div class="review-decisions">
        <button class="submit-button" type="button" data-review-action="resolve">Resolve</button>
        ${item.reported_user_id || item.contribution_id || fallback?.[1]?.includes(":") ? '<button class="outline-button is-danger" type="button" data-review-action="suspend">Suspend account</button>' : ""}
        <button class="outline-button" type="button" data-review-action="dismiss">Dismiss</button>
      </div>
    </article>
  `;
}

async function loadInbox() {
  accessStatus.textContent = "";
  reviewCount.textContent = "Loading...";
  try {
    const payload = await moderationRequest(`?status=${encodeURIComponent(reviewFilter)}`);
    const contributions = reviewFilter === "needs"
      ? payload.informationNeeds || []
      : reviewFilter === "followups"
        ? payload.followUps || []
      : reviewFilter === "enrichment"
        ? payload.enrichmentFacts || []
        : reviewFilter === "claims"
          ? payload.verificationClaims || []
        : reviewFilter === "reports"
          ? payload.reports || []
        : payload.contributions || [];
    sessionStorage.setItem("auditmap-review-token", reviewToken);
    accessSection.hidden = true;
    workspace.hidden = false;
    reviewCount.textContent = reviewFilter === "needs"
      ? `${contributions.length} ${contributions.length === 1 ? "information gap" : "information gaps"}`
      : reviewFilter === "followups"
        ? `${contributions.length} ${contributions.length === 1 ? "follow-up" : "follow-ups"}`
      : reviewFilter === "enrichment"
        ? `${contributions.length} ${contributions.length === 1 ? "AI fact" : "AI facts"}`
        : reviewFilter === "claims"
          ? `${contributions.length} ${contributions.length === 1 ? "visitor claim" : "visitor claims"}`
        : reviewFilter === "reports"
          ? `${contributions.length} open ${contributions.length === 1 ? "report" : "reports"}`
        : `${contributions.length} ${contributions.length === 1 ? "contribution" : "contributions"}`;
    reviewEmpty.hidden = contributions.length !== 0;
    const renderer = reviewFilter === "needs"
      ? renderInformationNeed
      : reviewFilter === "followups"
        ? renderFollowUp
      : reviewFilter === "enrichment"
        ? renderEnrichmentFact
        : reviewFilter === "claims"
          ? renderVerificationClaim
        : reviewFilter === "reports"
          ? renderReport
        : renderContribution;
    reviewList.innerHTML = contributions.map(renderer).join("");
  } catch (error) {
    if (error.status === 401) sessionStorage.removeItem("auditmap-review-token");
    accessSection.hidden = false;
    workspace.hidden = true;
    accessStatus.textContent = error.message;
  }
}

async function decide(item, action) {
  const status = item.querySelector("[data-review-status]");
  const buttons = [...item.querySelectorAll("button")];
  if (action === "reject" && !window.confirm("Reject this contribution and keep it private?")) {
    return;
  }
  if (action === "suspend" && !window.confirm("Suspend this account from all community actions?")) {
    return;
  }
  buttons.forEach((button) => {
    button.disabled = true;
  });
  status.textContent =
    action === "analyze"
      ? "Running AI review..."
      : action === "accept"
        ? "Accepting sourced fact..."
      : action === "suspend"
        ? "Suspending account..."
      : action === "resolve"
        ? "Resolving report..."
      : action === "answered"
        ? "Approving sourced answer..."
      : action === "followup_prepared"
        ? "Marking follow-up prepared..."
      : action === "dismiss"
        ? "Dismissing report..."
      : action === "publish"
        ? "Publishing..."
        : action === "pending"
          ? "Returning to review..."
          : "Rejecting...";
  try {
    const payload = await moderationRequest("", {
      method: "POST",
      body: JSON.stringify({
        id: item.dataset.reviewId,
        action,
        resourceType: item.dataset.reviewKind || "contribution",
        note: item.querySelector("textarea")?.value || "",
      }),
    });
    status.textContent = payload.message;
    item.classList.add("is-reviewed");
    setTimeout(loadInbox, 500);
  } catch (error) {
    status.textContent = error.message;
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

document.querySelector("#review-connect").addEventListener("click", () => {
  reviewToken = tokenInput.value.trim();
  if (!reviewToken) {
    accessStatus.textContent = "Enter the private review key first.";
    return;
  }
  loadInbox();
});

const accountConnect = document.querySelector("#review-account-connect");
const signedInToken = accountSessionToken();
if (signedInToken) {
  accountConnect.hidden = false;
  accountConnect.addEventListener("click", () => {
    reviewToken = signedInToken;
    loadInbox();
  });
}

tokenInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.querySelector("#review-connect").click();
});

document.querySelector("#review-refresh").addEventListener("click", loadInbox);
document.querySelectorAll("[data-review-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    reviewFilter = button.dataset.reviewFilter;
    document.querySelectorAll("[data-review-filter]").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    loadInbox();
  });
});
reviewList.addEventListener("click", (event) => {
  const copyButton = event.target.closest("[data-copy-followup]");
  if (copyButton) {
    const item = copyButton.closest(".review-item");
    const caption = item.querySelector("[data-followup-caption]")?.value || "";
    navigator.clipboard.writeText(caption).then(() => {
      item.querySelector("[data-review-status]").textContent = "Draft copied. Review it again before posting.";
    }).catch(() => {
      item.querySelector("[data-review-status]").textContent = "Copy was unavailable. Select the draft text manually.";
    });
    return;
  }
  const button = event.target.closest("[data-review-action]");
  if (!button) return;
  decide(button.closest(".review-item"), button.dataset.reviewAction);
});

if (reviewToken) loadInbox();
