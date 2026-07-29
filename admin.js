const accessSection = document.querySelector("#review-access");
const workspace = document.querySelector("#review-workspace");
const tokenInput = document.querySelector("#review-token");
const accessStatus = document.querySelector("#review-access-status");
const reviewList = document.querySelector("#review-list");
const reviewCount = document.querySelector("#review-count");
const reviewEmpty = document.querySelector("#review-empty");
let reviewToken = sessionStorage.getItem("auditmap-review-token") || "";
let reviewFilter = "pending";

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
  const aiPanel = aiReview
    ? `<div class="review-ai is-${escapeHtml(aiReview.decision)}">
        <span>AI recommends ${escapeHtml(aiReview.decision)}</span>
        <strong>${Math.round(Number(aiReview.confidence || 0) * 100)}%</strong>
        <p>${escapeHtml(aiReview.summary || "No explanation supplied.")}</p>
      </div>`
    : `<div class="review-ai is-pending"><span>Not yet analyzed</span></div>`;
  const decisions =
    item.moderation_status === "pending"
      ? `<button class="submit-button" type="button" data-review-action="publish">Publish</button>
         <button class="outline-button is-danger" type="button" data-review-action="reject">Reject</button>
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
          <p class="review-meta">${escapeHtml(contributionLabel(item.contribution_type))} · ${escapeHtml(submitted)}</p>
        </div>
        <a class="review-place-link" href="./place.html?id=${encodeURIComponent(place.public_id || "")}" target="_blank">View place ↗</a>
      </div>
      <blockquote>${escapeHtml(item.body)}</blockquote>
      ${aiPanel}
      <div class="review-evidence">
        ${rating}
        ${source}
        <span>By ${escapeHtml(item.author_name || "Local contributor")}</span>
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
      <p class="form-status" data-review-status role="status"></p>
      <div class="review-decisions">
        <button class="submit-button" type="button" data-review-action="answered">Mark answered</button>
        <button class="outline-button" type="button" data-review-action="dismissed">Dismiss</button>
      </div>
    </article>
  `;
}

async function loadInbox() {
  accessStatus.textContent = "";
  reviewCount.textContent = "Loading...";
  try {
    const payload = await moderationRequest(`?status=${encodeURIComponent(reviewFilter)}`);
    const contributions =
      reviewFilter === "needs"
        ? payload.informationNeeds || []
        : payload.contributions || [];
    sessionStorage.setItem("auditmap-review-token", reviewToken);
    accessSection.hidden = true;
    workspace.hidden = false;
    reviewCount.textContent =
      reviewFilter === "needs"
        ? `${contributions.length} ${contributions.length === 1 ? "information gap" : "information gaps"}`
        : `${contributions.length} ${contributions.length === 1 ? "contribution" : "contributions"}`;
    reviewEmpty.hidden = contributions.length !== 0;
    reviewList.innerHTML = contributions
      .map(reviewFilter === "needs" ? renderInformationNeed : renderContribution)
      .join("");
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
  buttons.forEach((button) => {
    button.disabled = true;
  });
  status.textContent =
    action === "analyze"
      ? "Running AI review..."
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
  const button = event.target.closest("[data-review-action]");
  if (!button) return;
  decide(button.closest(".review-item"), button.dataset.reviewAction);
});

if (reviewToken) loadInbox();
