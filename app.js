const fallbackInstitutions = [
  {
    id: "atl-library-central",
    name: "Atlanta Central Library",
    type: "Library",
    city: "Atlanta",
    state: "GA",
    address: "1 Margaret Mitchell Sq NW",
    latitude: 33.7553,
    longitude: -84.39,
    rating: 4.4,
    summary:
      "Open atrium creates some echo, but staff support is strong and quiet reading areas are easier to navigate.",
    tags: ["quiet zone", "staff support", "echo risk"],
    comments: [
      {
        author: "Community member",
        text: "Best experience was on the upper floors where ambient noise dropped a lot.",
      },
    ],
  },
  {
    id: "chicago-city-hall",
    name: "Chicago City Hall",
    type: "City office",
    city: "Chicago",
    state: "IL",
    address: "121 N LaSalle St",
    latitude: 41.8839,
    longitude: -87.6324,
    rating: 3.6,
    summary:
      "Busy lobby traffic makes conversations harder to follow during peak hours, but service windows are clearly marked.",
    tags: ["loud lobby", "clear signage"],
    comments: [
      {
        author: "OpenTask volunteer",
        text: "Mid-morning visits were much easier than late afternoon for spoken communication.",
      },
    ],
  },
  {
    id: "portland-union-station",
    name: "Portland Union Station",
    type: "Transit hub",
    city: "Portland",
    state: "OR",
    address: "800 NW 6th Ave",
    latitude: 45.5281,
    longitude: -122.6765,
    rating: 4.1,
    summary:
      "Announcements are generally audible, though crowd noise near the waiting area can compete with platform updates.",
    tags: ["public announcements", "crowd noise"],
    comments: [
      {
        author: "Transit rider",
        text: "Standing closer to the central display boards helped pair visual and audio information.",
      },
    ],
  },
];

const config = window.AUDITMAP_CONFIG || {};
const hasSupabaseConfig = Boolean(config.supabaseUrl && config.supabasePublishableKey);
const supabaseModule = window.supabase;
const supabase =
  hasSupabaseConfig && supabaseModule
    ? supabaseModule.createClient(config.supabaseUrl, config.supabasePublishableKey)
    : null;

const state = {
  institutions: [],
  search: "",
  type: "all",
  minRating: 0,
  location: null,
  user: null,
  mode: hasSupabaseConfig ? "live" : "demo",
  editing: null,
};

const elements = {
  authStatus: document.querySelector("#auth-status"),
  authMeta: document.querySelector("#auth-meta"),
  authBannerTitle: document.querySelector("#auth-banner-title"),
  authBannerCopy: document.querySelector("#auth-banner-copy"),
  formModeNote: document.querySelector("#form-mode-note"),
  signIn: document.querySelector("#sign-in-button"),
  signOut: document.querySelector("#sign-out-button"),
  count: document.querySelector("#stat-count"),
  cities: document.querySelector("#stat-cities"),
  rating: document.querySelector("#stat-rating"),
  search: document.querySelector("#search-input"),
  type: document.querySelector("#type-filter"),
  ratingFilter: document.querySelector("#rating-filter"),
  locationButton: document.querySelector("#location-button"),
  locationStatus: document.querySelector("#location-status"),
  results: document.querySelector("#results-count"),
  grid: document.querySelector("#directory-grid"),
  form: document.querySelector("#contribution-form"),
  preview: document.querySelector("#submission-preview"),
  copyPreview: document.querySelector("#copy-preview"),
  cancelEdit: document.querySelector("#cancel-edit-button"),
  submitButton: document.querySelector("#submit-button"),
  submitButtons: document.querySelectorAll("[data-submit-button]"),
  postNotice: document.querySelector("#post-notice"),
  modeBanner: document.querySelector("#mode-banner"),
};

function formatRating(value) {
  return Number(value || 0).toFixed(1);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setSubmitButtonLabel(label) {
  for (const button of elements.submitButtons) {
    button.textContent = label;
  }
}

function setSubmitButtonsDisabled(disabled) {
  for (const button of elements.submitButtons) {
    button.disabled = disabled;
  }
}

function setInstitutionFieldsReadOnly(readOnly) {
  for (const name of ["name", "type", "city", "state", "address", "latitude", "longitude"]) {
    const field = elements.form.elements.namedItem(name);
    if (!field || !("readOnly" in field)) {
      continue;
    }

    field.readOnly = readOnly;
    field.classList.toggle("is-readonly", readOnly);
  }
}

function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((value) => typeof value !== "number")) {
    return Number.POSITIVE_INFINITY;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

function buildSubmissionPreview(formData) {
  const name = formData.get("name")?.trim();
  const type = formData.get("type")?.trim();
  const city = formData.get("city")?.trim();
  const stateCode = formData.get("state")?.trim().toUpperCase();
  const address = formData.get("address")?.trim();
  const latitudeValue = formData.get("latitude");
  const longitudeValue = formData.get("longitude");
  const rating = Number(formData.get("rating"));
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const summary = formData.get("summary")?.trim();
  const comment = formData.get("comment")?.trim();

  const submission = {
    id: slugify(`${name}-${city}-${stateCode}`),
    name,
    type,
    city,
    state: stateCode,
    address,
    rating,
    summary,
    tags,
    comments: [
      {
        author: "New community submission",
        text: comment,
      },
    ],
  };

  if (latitudeValue !== "" && longitudeValue !== "") {
    submission.latitude = Number(latitudeValue);
    submission.longitude = Number(longitudeValue);
  }

  return submission;
}

async function loadInstitutionsFromJson() {
  try {
    const response = await fetch("./data/institutions.json");
    if (!response.ok) {
      throw new Error("Unable to load institution data");
    }

    return await response.json();
  } catch (error) {
    return fallbackInstitutions;
  }
}

function mergeSupabaseData(institutions, reviews) {
  const reviewsByInstitution = new Map();
  const currentUserId = state.user?.id;

  for (const review of reviews) {
    const collection = reviewsByInstitution.get(review.institution_id) || [];
    collection.push(review);
    reviewsByInstitution.set(review.institution_id, collection);
  }

  return institutions.map((institution) => {
    const institutionReviews = (reviewsByInstitution.get(institution.id) || []).sort((left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );

    const averageRating =
      institutionReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
      (institutionReviews.length || 1);

    const uniqueTags = [...new Set(institutionReviews.flatMap((review) => review.tags || []))];
    const latestReview = institutionReviews[0];
    const editableReview =
      institutionReviews.find((review) => review.user_id === currentUserId) || null;

    return {
      id: institution.slug,
      institutionId: institution.id,
      name: institution.name,
      type: institution.type,
      city: institution.city,
      state: institution.state,
      address: institution.address,
      latitude: institution.latitude,
      longitude: institution.longitude,
      canEditInstitution: Boolean(currentUserId && institution.created_by === currentUserId),
      editableReview: editableReview
        ? {
            id: editableReview.id,
            rating: Number(editableReview.rating || 0),
            summary: editableReview.summary,
            comment: editableReview.comment,
            tags: editableReview.tags || [],
          }
        : null,
      rating: institutionReviews.length ? averageRating : 0,
      summary: latestReview?.summary || "No reviews yet. Be the first to post an audio access report.",
      tags: uniqueTags,
      comments: institutionReviews.slice(0, 3).map((review) => ({
        id: review.id,
        author: review.author_name || "Signed-in contributor",
        text: review.comment,
        isOwner: Boolean(currentUserId && review.user_id === currentUserId),
      })),
    };
  });
}

async function loadInstitutions() {
  if (!supabase) {
    return loadInstitutionsFromJson();
  }

  const [{ data: institutions, error: institutionsError }, { data: reviews, error: reviewsError }] =
    await Promise.all([
      supabase
        .from("institutions")
        .select("id, slug, name, type, city, state, address, latitude, longitude, created_by, created_at")
        .order("name", { ascending: true }),
      supabase
        .from("reviews")
        .select("id, institution_id, user_id, author_name, rating, summary, comment, tags, created_at")
        .order("created_at", { ascending: false }),
    ]);

  if (institutionsError || reviewsError) {
    console.error(institutionsError || reviewsError);
    state.mode = "demo";
    renderModeBanner("Supabase is configured, but the public tables are not reachable yet. Showing demo data.");
    return loadInstitutionsFromJson();
  }

  renderModeBanner("Live mode is on. Guests can search publicly, and signed-in members can post.");
  return mergeSupabaseData(institutions || [], reviews || []);
}

function updateStats(records) {
  const cities = new Set(records.map((record) => `${record.city}, ${record.state}`));
  const average =
    records.reduce((sum, record) => sum + Number(record.rating || 0), 0) / (records.length || 1);

  elements.count.textContent = String(records.length);
  elements.cities.textContent = String(cities.size);
  elements.rating.textContent = formatRating(average);
}

function populateTypeFilter(records) {
  const existingValues = new Set(
    Array.from(elements.type.querySelectorAll("option")).map((option) => option.value),
  );
  const types = [...new Set(records.map((record) => record.type))].sort();

  for (const type of types) {
    if (existingValues.has(type)) {
      continue;
    }

    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    elements.type.append(option);
  }
}

function getFilteredInstitutions() {
  const filtered = state.institutions.filter((record) => {
    const haystack = [
      record.name,
      record.type,
      record.city,
      record.state,
      record.address,
      ...(record.tags || []),
      record.summary,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = haystack.includes(state.search.toLowerCase());
    const matchesType = state.type === "all" || record.type === state.type;
    const matchesRating = Number(record.rating) >= state.minRating;

    return matchesSearch && matchesType && matchesRating;
  });

  if (!state.location) {
    return filtered;
  }

  return filtered
    .map((record) => ({
      ...record,
      distanceMiles: calculateDistanceMiles(
        state.location.latitude,
        state.location.longitude,
        record.latitude,
        record.longitude,
      ),
    }))
    .sort((left, right) => left.distanceMiles - right.distanceMiles);
}

function renderDirectory() {
  const records = getFilteredInstitutions();
  elements.results.textContent = `${records.length} institution${records.length === 1 ? "" : "s"} shown`;

  if (!records.length) {
    elements.grid.innerHTML = `
      <article class="directory-card">
        <h3>No matches yet</h3>
        <p class="summary">Try widening the filters or search another city.</p>
      </article>
    `;
    return;
  }

  elements.grid.innerHTML = records
    .map(
      (record) => `
        <article class="directory-card">
          <div class="card-topline">
            <h3>${escapeHtml(record.name)}</h3>
            <span class="rating-pill">${formatRating(record.rating)} / 5</span>
          </div>
          <div class="card-meta">
            <span class="institution-type">${escapeHtml(record.type)}</span>
            <span>${escapeHtml(record.city)}, ${escapeHtml(record.state)}</span>
            <span>${escapeHtml(record.address)}</span>
            ${
              typeof record.distanceMiles === "number" && Number.isFinite(record.distanceMiles)
                ? `<span>${formatRating(record.distanceMiles)} miles away</span>`
                : ""
            }
          </div>
          <p class="summary">${escapeHtml(record.summary)}</p>
          <div class="tag-row">
            ${(record.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          ${(record.comments || [])
            .map(
              (comment) => `
                <div class="comment-block">
                  <div class="comment-topline">
                    <strong>${escapeHtml(comment.author)}</strong>
                    <span>${comment.isOwner ? "Your review" : "Community comment"}</span>
                  </div>
                  <p class="comment-text">${escapeHtml(comment.text)}</p>
                </div>
              `,
            )
            .join("")}
          ${
            record.editableReview
              ? `
                <div class="card-actions">
                  <button
                    class="button button-secondary card-action-button"
                    type="button"
                    data-edit-record="${escapeHtml(record.id)}"
                  >
                    ${record.canEditInstitution ? "Edit listing and review" : "Edit your review"}
                  </button>
                  <span class="card-action-note">
                    ${
                      record.canEditInstitution
                        ? "You created this listing."
                        : "Institution details stay locked unless you created the listing."
                    }
                  </span>
                </div>
              `
              : ""
          }
        </article>
      `,
    )
    .join("");
}

function getRecordBySlug(slug) {
  return state.institutions.find((record) => record.id === slug) || null;
}

function populateFormFromRecord(record) {
  const editableReview = record?.editableReview;
  if (!editableReview) {
    return;
  }

  const fieldValues = {
    name: record.name,
    type: record.type,
    city: record.city,
    state: record.state,
    address: record.address,
    latitude: typeof record.latitude === "number" ? String(record.latitude) : "",
    longitude: typeof record.longitude === "number" ? String(record.longitude) : "",
    rating: String(editableReview.rating || ""),
    tags: (editableReview.tags || []).join(", "),
    summary: editableReview.summary || "",
    comment: editableReview.comment || "",
  };

  for (const [name, value] of Object.entries(fieldValues)) {
    const field = elements.form.elements.namedItem(name);
    if (!field) {
      continue;
    }

    field.value = value;
  }
}

function startEditingRecord(slug) {
  const record = getRecordBySlug(slug);
  if (!record?.editableReview) {
    return;
  }

  state.editing = {
    institutionId: record.institutionId,
    reviewId: record.editableReview.id,
    canEditInstitution: record.canEditInstitution,
  };

  populateFormFromRecord(record);
  updatePreview(buildSubmissionPreview(new FormData(elements.form)));
  syncAuthUi();
  elements.postNotice.textContent = record.canEditInstitution
    ? "Loaded your live post into the form. Update the listing details or review, then publish."
    : "Loaded your live review into the form. Institution fields are locked because you did not create this listing.";
  elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopEditing() {
  state.editing = null;
  setInstitutionFieldsReadOnly(false);
  elements.form.reset();
  syncAuthUi();
}

function restorePreview() {
  const cached = window.localStorage.getItem("auditmap-submission-preview");
  if (cached) {
    elements.preview.textContent = cached;
  }
}

function updatePreview(previewObject) {
  const formatted = JSON.stringify(previewObject, null, 2);
  elements.preview.textContent = formatted;
  window.localStorage.setItem("auditmap-submission-preview", formatted);
}

function renderModeBanner(message) {
  elements.modeBanner.textContent = message;
}

function getAuthorName(user) {
  if (!user) {
    return "Signed-in contributor";
  }

  return (
    user.user_metadata?.user_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Signed-in contributor"
  );
}

function syncFormUi() {
  if (state.editing) {
    elements.cancelEdit.hidden = false;
    elements.formModeNote.textContent = state.editing.canEditInstitution
      ? "Editing your existing live post. You can update both the listing details and your review."
      : "Editing your existing review. Institution details stay locked because you did not create this listing.";
    elements.authBannerTitle.textContent = state.editing.canEditInstitution
      ? "You are editing a live post."
      : "You are editing your review.";
    elements.authBannerCopy.textContent = state.editing.canEditInstitution
      ? "Update the listing details, rating, notes, or comment, then publish to refresh the directory."
      : "Update your rating, notes, or comment, then publish to refresh the directory.";
    setInstitutionFieldsReadOnly(!state.editing.canEditInstitution);
    setSubmitButtonLabel(state.editing.canEditInstitution ? "Update post" : "Update your review");
    return;
  }

  elements.cancelEdit.hidden = true;
  elements.formModeNote.textContent = "Start a new listing or load one of your existing live posts to edit.";
  setInstitutionFieldsReadOnly(false);

  if (!supabase) {
    elements.authBannerTitle.textContent = "Live posting is off in demo mode.";
    elements.authBannerCopy.textContent =
      "Draft the JSON preview now, then add Supabase config later to turn on authentication and live publishing.";
    setSubmitButtonLabel("Generate preview");
    return;
  }

  elements.authBannerTitle.textContent = "Posting requires login.";

  if (state.user) {
    elements.authBannerCopy.textContent =
      "You are signed in and can publish new institutions and reviews to the public directory.";
    setSubmitButtonLabel("Publish entry");
    return;
  }

  elements.authBannerCopy.textContent =
    "Sign in with GitHub to publish, or draft a preview first while signed out.";
  setSubmitButtonLabel("Generate preview");
}

function syncAuthUi() {
  if (!supabase) {
    elements.authStatus.textContent = "Demo mode";
    elements.authMeta.textContent = "Add your Supabase URL and publishable key to turn on live auth and posting.";
    elements.signIn.hidden = true;
    elements.signOut.hidden = true;
    elements.postNotice.textContent = "This form is currently running in demo mode.";
    syncFormUi();
    return;
  }

  if (state.user) {
    elements.authStatus.textContent = `Signed in as ${getAuthorName(state.user)}`;
    elements.authMeta.textContent = "You can publish new institutions and reviews now.";
    elements.signIn.hidden = true;
    elements.signOut.hidden = false;
    elements.postNotice.textContent = state.editing
      ? state.editing.canEditInstitution
        ? "Updating writes to Supabase and refreshes the public directory."
        : "Updating writes your review to Supabase. Institution fields are locked."
      : "Posting writes to Supabase and refreshes the public directory.";
    syncFormUi();
    return;
  }

  elements.authStatus.textContent = "Guest mode";
  elements.authMeta.textContent = "Guests can search freely. Sign in with GitHub to publish.";
  elements.signIn.hidden = false;
  elements.signOut.hidden = true;
  elements.postNotice.textContent = "You can draft a post now, then sign in to publish it.";
  syncFormUi();
}

async function refreshDirectory() {
  state.institutions = await loadInstitutions();
  updateStats(state.institutions);
  populateTypeFilter(state.institutions);
  renderDirectory();
}

async function syncSession() {
  if (!supabase) {
    syncAuthUi();
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  state.user = user;
  if (!state.user) {
    state.editing = null;
    setInstitutionFieldsReadOnly(false);
  }
  syncAuthUi();
}

async function signIn() {
  if (!supabase) {
    return;
  }

  const provider = config.authProvider || "github";
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.href,
    },
  });

  if (error) {
    elements.postNotice.textContent = error.message;
  }
}

async function signOut() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    elements.postNotice.textContent = error.message;
  }
}

async function ensureInstitution(submission) {
  const { data: existingRows, error: selectError } = await supabase
    .from("institutions")
    .select("id")
    .eq("slug", submission.id)
    .limit(1);

  if (selectError) {
    throw selectError;
  }

  if (existingRows && existingRows.length > 0) {
    return existingRows[0].id;
  }

  const { data: insertedRows, error: insertError } = await supabase
    .from("institutions")
    .insert({
      slug: submission.id,
      name: submission.name,
      type: submission.type,
      city: submission.city,
      state: submission.state,
      address: submission.address,
      latitude: submission.latitude ?? null,
      longitude: submission.longitude ?? null,
    })
    .select("id");

  if (insertError) {
    throw insertError;
  }

  return insertedRows[0].id;
}

async function publishSubmission(submission) {
  const institutionId = await ensureInstitution(submission);

  const { error } = await supabase.from("reviews").insert({
    institution_id: institutionId,
    author_name: getAuthorName(state.user),
    rating: submission.rating,
    summary: submission.summary,
    comment: submission.comments[0].text,
    tags: submission.tags,
  });

  if (error) {
    throw error;
  }
}

async function updateSubmission(submission) {
  const record = state.institutions.find(
    (institution) => institution.institutionId === state.editing?.institutionId,
  );

  if (!record?.editableReview || !state.user) {
    throw new Error("This post is no longer available to edit.");
  }

  if (state.editing.canEditInstitution) {
    const { error: institutionError } = await supabase
      .from("institutions")
      .update({
        slug: submission.id,
        name: submission.name,
        type: submission.type,
        city: submission.city,
        state: submission.state,
        address: submission.address,
        latitude: submission.latitude ?? null,
        longitude: submission.longitude ?? null,
      })
      .eq("id", record.institutionId)
      .eq("created_by", state.user.id);

    if (institutionError) {
      throw institutionError;
    }
  }

  const { error: reviewError } = await supabase
    .from("reviews")
    .update({
      author_name: getAuthorName(state.user),
      rating: submission.rating,
      summary: submission.summary,
      comment: submission.comments[0].text,
      tags: submission.tags,
    })
    .eq("id", record.editableReview.id)
    .eq("user_id", state.user.id);

  if (reviewError) {
    throw reviewError;
  }
}

function requestLocationSearch() {
  if (!navigator.geolocation) {
    elements.locationStatus.textContent = "Location search is not supported in this browser.";
    return;
  }

  elements.locationStatus.textContent = "Checking your location...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      elements.locationStatus.textContent = "Showing the closest institutions to your current location.";
      renderDirectory();
    },
    () => {
      elements.locationStatus.textContent = "Location access was denied. You can still search by city.";
    },
    { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 },
  );
}

function wireEvents() {
  elements.search.addEventListener("input", (event) => {
    state.search = event.target.value;
    if (state.search.trim()) {
      state.location = null;
      elements.locationStatus.textContent = "Showing typed search results. Guests can search without logging in.";
    }
    renderDirectory();
  });

  elements.type.addEventListener("change", (event) => {
    state.type = event.target.value;
    renderDirectory();
  });

  elements.ratingFilter.addEventListener("change", (event) => {
    state.minRating = Number(event.target.value);
    renderDirectory();
  });

  elements.locationButton.addEventListener("click", requestLocationSearch);

  elements.grid.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-record]");
    if (!editButton) {
      return;
    }

    startEditingRecord(editButton.dataset.editRecord);
  });

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submission = buildSubmissionPreview(new FormData(elements.form));
    const wasEditing = Boolean(state.editing);
    let noticeMessage = "";
    updatePreview(submission);

    if (!supabase) {
      elements.postNotice.textContent = "Preview generated. Add your Supabase config to enable real posting.";
      return;
    }

    if (!state.user) {
      elements.postNotice.textContent = "Preview generated. Sign in with GitHub to publish this entry.";
      return;
    }

    setSubmitButtonsDisabled(true);
    setSubmitButtonLabel(wasEditing ? "Saving..." : "Publishing...");

    try {
      if (wasEditing) {
        await updateSubmission(submission);
      } else {
        await publishSubmission(submission);
      }

      state.editing = null;
      setInstitutionFieldsReadOnly(false);
      elements.form.reset();
      elements.preview.textContent = wasEditing ? "Updated successfully." : "Published successfully.";
      window.localStorage.removeItem("auditmap-submission-preview");
      noticeMessage = wasEditing
        ? "Your updates are live and publicly searchable now."
        : "Your entry is live and publicly searchable now.";
      elements.postNotice.textContent = noticeMessage;
      await refreshDirectory();
    } catch (error) {
      console.error(error);
      noticeMessage = error.message || "Publishing failed.";
      elements.postNotice.textContent = noticeMessage;
      updatePreview(submission);
    } finally {
      syncAuthUi();
      setSubmitButtonsDisabled(false);
      if (noticeMessage) {
        elements.postNotice.textContent = noticeMessage;
      }
    }
  });

  elements.copyPreview.addEventListener("click", async () => {
    const text = elements.preview.textContent;
    if (!text || text === "No submission generated yet.") {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      elements.copyPreview.textContent = "Copied";
      window.setTimeout(() => {
        elements.copyPreview.textContent = "Copy preview";
      }, 1800);
    } catch (error) {
      elements.copyPreview.textContent = "Copy failed";
      window.setTimeout(() => {
        elements.copyPreview.textContent = "Copy preview";
      }, 1800);
    }
  });

  elements.signIn.addEventListener("click", signIn);
  elements.signOut.addEventListener("click", signOut);
  elements.cancelEdit.addEventListener("click", stopEditing);

  if (supabase) {
    supabase.auth.onAuthStateChange(async () => {
      await syncSession();
      await refreshDirectory();
    });
  }
}

async function init() {
  if (supabase) {
    renderModeBanner("Connecting to live public data...");
  } else {
    renderModeBanner("Demo mode is active. Search works now, and live posting turns on after Supabase is configured.");
  }

  await syncSession();
  await refreshDirectory();
  restorePreview();
  wireEvents();
}

init();
