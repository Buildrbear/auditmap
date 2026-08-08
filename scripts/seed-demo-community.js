const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
if (!url || !serviceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const root = path.resolve(__dirname, "..");
const credentialsPath = path.join(root, ".auditmap-demo-credentials.json");
const catalog = require("../data/institutions.json");
const preferredPlaces = [
  "dix-park",
  "downtown-cary-park",
  "lake-johnson-park",
  "marbles-kids-museum",
  "grand-canyon-national-park",
];
const demoMedia = [
  { kind: "photo", url: "/assets/parks/dix-park/sunflower-field.webp", alt: "Sunflowers at Dix Park" },
  { kind: "photo", url: "/assets/parks/dix-park/dog-park.webp", alt: "Dog park at Dix Park" },
  { kind: "photo", url: "/assets/parks/dix-park/big-field.webp", alt: "Open field at Dix Park" },
  { kind: "photo", url: "/assets/parks/downtown-cary-park/barkyard.jpg", alt: "The Barkyard at Downtown Cary Park" },
  { kind: "photo", url: "/assets/parks/downtown-cary-park/great-lawn.jpg", alt: "Great Lawn at Downtown Cary Park" },
  { kind: "photo_360", url: "/assets/parks/az/grand-canyon-village/grand-canyon-national-park/trail-of-time-360.jpg", alt: "Trail of Time 360 degree view" },
];

const personas = [
  {
    key: "founder",
    avatarUrl: "/assets/demo-avatars/founder.webp",
    email: "founder@demo.auditmap.org",
    name: "Michael H.",
    role: "member",
    contributionCount: 8,
    verifiedCount: 5,
    savedCount: 5,
    badges: ["first_crumb", "eyes_on_the_trail", "full_circle", "detail_detective"],
  },
  {
    key: "new-explorer",
    avatarUrl: "/assets/demo-avatars/maya-chen.webp",
    email: "maya.chen@demo.auditmap.org",
    name: "Maya Chen",
    role: "member",
    contributionCount: 0,
    verifiedCount: 0,
    savedCount: 2,
    badges: [],
  },
  {
    key: "first-crumb",
    avatarUrl: "/assets/demo-avatars/jordan-brooks.webp",
    email: "jordan.brooks@demo.auditmap.org",
    name: "Jordan Brooks",
    role: "member",
    contributionCount: 1,
    verifiedCount: 0,
    savedCount: 3,
    badges: ["first_crumb"],
  },
  {
    key: "trail-helper",
    avatarUrl: "/assets/demo-avatars/elena-rivera.webp",
    email: "elena.rivera@demo.auditmap.org",
    name: "Elena Rivera",
    role: "member",
    contributionCount: 4,
    verifiedCount: 2,
    savedCount: 4,
    badges: ["first_crumb", "fresh_tracks"],
  },
  {
    key: "path-finder",
    avatarUrl: "/assets/demo-avatars/theo-morgan.webp",
    email: "theo.morgan@demo.auditmap.org",
    name: "Theo Morgan",
    role: "member",
    contributionCount: 8,
    verifiedCount: 5,
    savedCount: 5,
    badges: ["first_crumb", "eyes_on_the_trail", "full_circle", "detail_detective"],
  },
  {
    key: "neighborhood-guide",
    avatarUrl: "/assets/demo-avatars/priya-shah.webp",
    email: "priya.shah@demo.auditmap.org",
    name: "Priya Shah",
    role: "member",
    contributionCount: 20,
    verifiedCount: 20,
    savedCount: 5,
    badges: ["first_crumb", "eyes_on_the_trail", "full_circle", "detail_detective", "park_friend", "fresh_tracks"],
  },
];

const crumbBodies = [
  "The quieter path along the edge felt easier with a stroller than the busier central route.",
  "There was useful shade near the seating area in the late afternoon.",
  "The closest parking filled quickly, but the next entrance was an easy walk.",
  "The open lawn worked well for a mixed-age group with room to spread out.",
  "The restroom sign was easy to miss from the main path, so look near the picnic area.",
  "The dog area had a separate space that made a first visit feel less hectic.",
  "This view helped us understand the terrain before deciding where to start.",
  "The path surface was comfortable after light rain, with only one soft patch near the turn.",
];

function uuidFor(value) {
  const hex = crypto.createHash("sha256").update(`auditmap-demo:${value}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function password() {
  return `${crypto.randomBytes(15).toString("base64url")}!7a`;
}

function slug(name, id) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${id.replace(/-/g, "").slice(0, 6)}`;
}

function demoProfile(persona, places) {
  const levels = {
    founder: { key: "path_finder", label: "Path Finder", points: 53, next: "Neighborhood Guide" },
    "new-explorer": { key: "new_explorer", label: "New Explorer", points: 0, next: "First Crumb" },
    "first-crumb": { key: "first_crumb", label: "First Crumb", points: 4, next: "Trail Helper" },
    "trail-helper": { key: "trail_helper", label: "Trail Helper", points: 24, next: "Path Finder" },
    "path-finder": { key: "path_finder", label: "Path Finder", points: 53, next: "Neighborhood Guide" },
    "neighborhood-guide": { key: "neighborhood_guide", label: "Neighborhood Guide", points: 157, next: null },
  };
  const level = levels[persona.key];
  return {
    displayName: persona.name,
    avatarUrl: persona.avatarUrl,
    level,
    approvedCrumbs: persona.contributionCount,
    verifiedCrumbs: persona.verifiedCount,
    placesHelped: Math.min(persona.contributionCount, places.length),
    thanks: persona.key === "neighborhood-guide" ? 18 : persona.key === "path-finder" ? 7 : 0,
    badges: persona.badges.map((badge_key) => ({ badge_key })),
    savedPlaceIds: places.slice(0, persona.savedCount).map((place) => place.public_id),
    recentCrumbs: Array.from({ length: Math.min(persona.contributionCount, 6) }, (_, index) => ({
      id: uuidFor(`${persona.key}:fallback:${index}`),
      placeId: places[index % places.length].public_id,
      placeName: places[index % places.length].name,
      body: crumbBodies[index % crumbBodies.length],
      type: index % 5 === 3 ? "confirmation" : "observation",
      status: index < persona.verifiedCount ? "Verified" : "Published",
      observedAt: new Date(Date.now() - index * 3 * 24 * 60 * 60 * 1000).toISOString(),
      media: index < 6 ? [demoMedia[index % demoMedia.length]] : [],
    })),
  };
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${url}${endpoint}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${endpoint} failed (${response.status}): ${text}`);
  }
  return payload;
}

async function rest(resource, options = {}) {
  return request(`/rest/v1/${resource}`, {
    ...options,
    headers: {
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });
}

async function authUsers() {
  const payload = await request("/auth/v1/admin/users?per_page=1000");
  return payload.users || [];
}

async function upsertUser(persona, existing, nextPassword, profile) {
  const body = {
    email: persona.email,
    password: nextPassword,
    email_confirm: true,
    user_metadata: { full_name: persona.name },
    app_metadata: {
      auditmap_role: persona.role,
      auditmap_demo: true,
      auditmap_demo_seed_complete: true,
      auditmap_demo_profile: profile,
    },
  };
  if (existing) {
    return request(`/auth/v1/admin/users/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
  return request("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function availablePlaces() {
  const rows = await rest("institutions?select=id,public_id,name&order=name.asc&limit=1000");
  const backingInstitution = rows?.[0];
  if (!backingInstitution) throw new Error("At least one shared institution is required for the demo cohort.");
  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  return preferredPlaces.map((id) => {
    const place = catalogById.get(id);
    if (!place) throw new Error(`Catalog place ${id} is unavailable.`);
    return { id: backingInstitution.id, public_id: place.id, name: place.name };
  });
}

async function seedPersona(persona, user, places) {
  await rest("community_profiles?on_conflict=user_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify({
      user_id: user.id,
      public_slug: slug(persona.name, user.id),
      display_name: persona.name,
      profile_status: "private",
    }),
  });

  if (persona.savedCount) {
    await rest("user_saved_places?on_conflict=user_id,place_id", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify(places.slice(0, persona.savedCount).map((place) => ({
        user_id: user.id,
        place_id: place.public_id,
      }))),
    });
  }

  const contributions = Array.from({ length: persona.contributionCount }, (_, index) => {
    const place = places[index % places.length];
    const contributionId = uuidFor(`${persona.key}:contribution:${index}`);
    const verified = index < persona.verifiedCount;
    return {
      id: contributionId,
      institution_id: place.id,
      user_id: user.id,
      author_name: persona.name,
      contribution_type: index % 6 === 4 ? "correction" : index % 5 === 3 ? "confirmation" : "observation",
      body: crumbBodies[index % crumbBodies.length],
      metadata: {
        demoSeed: true,
        demoPersona: persona.key,
        demoPlaceId: place.public_id,
        demoPlaceName: place.name,
        demoMedia: index < 6 ? [demoMedia[index % demoMedia.length]] : [],
      },
      moderation_status: "published",
      analysis_status: "complete",
      verification_status: verified ? "verified" : "unverified",
      observed_at: new Date(Date.now() - index * 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  if (contributions.length) {
    await rest("contributions?on_conflict=id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify(contributions),
    });

    const events = contributions.flatMap((contribution, index) => {
      const base = [{
        id: uuidFor(`${persona.key}:event:${index}:text`),
        user_id: user.id,
        contribution_id: contribution.id,
        event_type: "approved_text",
        points: 1,
        source_key: `demo:${persona.key}:${index}:text`,
        metadata: { institutionId: contribution.institution_id, demoSeed: true },
      }];
      if (index < persona.verifiedCount) {
        base.push({
          id: uuidFor(`${persona.key}:event:${index}:verification`),
          user_id: user.id,
          contribution_id: contribution.id,
          event_type: "accepted_verification",
          points: 4,
          source_key: `demo:${persona.key}:${index}:verification`,
          metadata: { institutionId: contribution.institution_id, demoSeed: true },
        });
      }
      if (index < 6) {
        const is360 = demoMedia[index % demoMedia.length].kind === "photo_360";
        base.push({
          id: uuidFor(`${persona.key}:event:${index}:media`),
          user_id: user.id,
          contribution_id: contribution.id,
          event_type: is360 ? "approved_360" : "approved_photo",
          points: is360 ? 10 : 3,
          source_key: `demo:${persona.key}:${index}:media`,
          metadata: { institutionId: contribution.institution_id, demoSeed: true },
        });
      }
      if (persona.key === "neighborhood-guide" && index < 4) {
        base.push({
          id: uuidFor(`${persona.key}:event:${index}:correction`),
          user_id: user.id,
          contribution_id: contribution.id,
          event_type: "accepted_correction",
          points: 8,
          source_key: `demo:${persona.key}:${index}:correction`,
          metadata: { institutionId: contribution.institution_id, demoSeed: true },
        });
      }
      return base;
    });
    await rest("contribution_impact_events?on_conflict=source_key", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify(events),
    });
  }

  if (persona.badges.length) {
    await rest("contributor_badges?on_conflict=user_id,badge_key", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify(persona.badges.map((badgeKey) => ({
        user_id: user.id,
        badge_key: badgeKey,
        metadata: { demoSeed: true },
      }))),
    });
  }
}

async function seedDemoCommunity({ writeCredentials = true, refuseExisting = false } = {}) {
  const places = await availablePlaces();
  if (places.length < 5) throw new Error("Five catalog places are required for the demo cohort.");
  const existingByEmail = new Map((await authUsers()).map((user) => [user.email?.toLowerCase(), user]));
  if (refuseExisting && personas.every((persona) =>
    existingByEmail.get(persona.email)?.app_metadata?.auditmap_demo_seed_complete === true,
  )) {
    const error = new Error("The demo cohort has already been created.");
    error.status = 409;
    throw error;
  }
  const credentials = await Promise.all(personas.map(async (persona) => {
    const nextPassword = password();
    const user = await upsertUser(
      persona,
      existingByEmail.get(persona.email),
      nextPassword,
      demoProfile(persona, places),
    );
    try {
      await seedPersona(persona, user, places);
    } catch (error) {
      if (!/community_profiles|contribution_impact_events|contributor_badges|user_saved_places/.test(error.message)) {
        throw error;
      }
    }
    return {
      persona: persona.key,
      name: persona.name,
      email: persona.email,
      password: nextPassword,
      role: persona.role,
      expectedStage: persona.key.replaceAll("-", " "),
    };
  }));
  const result = { generatedAt: new Date().toISOString(), accounts: credentials };
  if (writeCredentials) {
    fs.writeFileSync(credentialsPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
    fs.chmodSync(credentialsPath, 0o600);
  }
  console.log(`Seeded ${credentials.length} private demo accounts across ${places.length} places.`);
  if (writeCredentials) console.log(`Credentials written to ${credentialsPath}`);
  return result;
}

if (require.main === module) {
  seedDemoCommunity().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { seedDemoCommunity };
