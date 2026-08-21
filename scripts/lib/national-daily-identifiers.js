function nationalDailyPostId(placeId) {
  if (!placeId) throw new Error("National daily post identity requires a place ID");
  return `daily_${placeId}`.slice(0, 80);
}

module.exports = { nationalDailyPostId };
