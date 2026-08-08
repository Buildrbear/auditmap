#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-05";
const downloadImages = process.argv.includes("--download");

const officialCarlsbadLicense = "Official City of Carlsbad photograph; source attribution retained";
const officialOceansideLicense = "Official City of Oceanside photograph; source attribution retained";
const communityLicense = "Credited public community photograph; source attribution retained";

const galleries = {
  "launch-ca-carlsbad-aviara-community-park": [
    {
      filename: "playground.webp",
      imageUrl: "https://s3-media0.fl.yelpcdn.com/bphoto/Va9fZB6ukn9YDWtw0BycpA/l.jpg?w=3840",
      source: "https://www.mapquest.com/us/california/aviara-community-park-44270776",
      author: "MapQuest / Yelp community contributor",
      license: communityLicense,
      alt: "Playground equipment and family play area at Aviara Community Park",
    },
    {
      filename: "large-play-structure.webp",
      imageUrl: "https://s3-media0.fl.yelpcdn.com/bphoto/CGRLJjmFMMl8VtoO7wd_xw/l.jpg?w=3840",
      source: "https://www.mapquest.com/us/california/aviara-community-park-44270776",
      author: "MapQuest / Yelp community contributor",
      license: communityLicense,
      alt: "Large climbing and slide structure at Aviara Community Park",
    },
  ],
  "launch-ca-carlsbad-calavera-hills-community-park": [
    {
      filename: "park-entrance.webp",
      imageUrl: "https://media-cdn.tripadvisor.com/media/photo-w/07/5b/ca/9c/entrance.jpg",
      source: "https://airial.travel/attractions/united-states/carlsbad/calavera-hills-community-park-dlESW-m6",
      author: "Tripadvisor community contributor via Airial",
      license: communityLicense,
      alt: "Entrance and developed grounds at Calavera Hills Community Park",
    },
    {
      filename: "shaded-playground.webp",
      imageUrl: "https://calaverahills.net/wp-content/uploads/2024/11/playground1.jpg",
      source: "https://calaverahills.net/calavera-hills-community-center-park/",
      author: "CalaveraHills.net",
      license: "Local community photograph; source attribution retained",
      alt: "Playground and shade canopy at Calavera Hills Community Park",
    },
  ],
  "launch-ca-carlsbad-poinsettia-community-park": [
    {
      filename: "modern-playground.webp",
      imageUrl: "https://sandiegomoms.com/wp-content/uploads/2019/09/Poinsettia-Park-3.jpg",
      source: "https://sandiegomoms.com/2019/09/blippi-fans-will-love-carlsbads-newest-playground/",
      author: "Tabitha Frost / San Diego Moms",
      license: "Credited local editorial photograph; source attribution retained",
      alt: "Modern slides and climbing equipment at Poinsettia Community Park",
    },
    {
      filename: "dog-park.webp",
      imageUrl: "https://ewscripps.brightspotcdn.com/dims4/default/18e8ddd/2147483647/strip/true/crop/1792x1008%2B2%2B0/resize/1280x720%21/quality/90/?url=http%3A%2F%2Fewscripps-brightspot.s3.amazonaws.com%2Fde%2F50%2F616ac9fb4388bccb729bb10748bc%2Fscreen-shot-2022-07-28-at-1.42.18+PM.png",
      source: "https://www.10news.com/lifestyle/exploring-san-diego/poinsettia-dog-park-pooches-have-new-place-to-stretch-their-legs-in-carlsbad",
      author: "City of Carlsbad / ABC 10News",
      license: "City-provided news photograph; source attribution retained",
      alt: "Fenced natural-grass dog park at Poinsettia Community Park",
      forceRefresh: true,
    },
  ],
  "launch-ca-carlsbad-pine-avenue-community-park": [
    {
      filename: "basketball-court.webp",
      imageUrl: "https://images.squarespace-cdn.com/content/v1/5e4c8596c00b5524c52ec609/1598912530494-ELZLJNY486Q02EAIH5JF/Pine+Avenue+Community+Center+Basketball+Court?format=1600w",
      source: "https://www.rntarchitects.com/pine-avenue-community-center",
      author: "RNT Architects",
      license: "Project photograph published by the City facility architect; source attribution retained",
      alt: "Basketball court at Pine Avenue Community Center and Park",
    },
    {
      filename: "community-garden.webp",
      imageUrl: "https://images.squarespace-cdn.com/content/v1/5e4c8596c00b5524c52ec609/1598912617947-2WWOG307DF5DLVYXNKHA/Pine+Avenue+Community+Center+Community+Garden?format=1600w",
      source: "https://www.rntarchitects.com/pine-avenue-community-center",
      author: "RNT Architects",
      license: "Project photograph published by the City facility architect; source attribution retained",
      alt: "Raised beds and gathering space in the Pine Avenue Community Garden",
    },
  ],
  "launch-ca-carlsbad-stagecoach-community-park": [
    {
      filename: "outdoor-courts.webp",
      imageUrl: "https://www.dimebasketball.org/images/blog/stagecoach-outdoor.jpg",
      source: "https://www.dimebasketball.org/blog/discover-stagecoach-community-park-a-gem-in-carlsbads-crown",
      author: "Dime Basketball Club",
      license: "Local nonprofit sports photograph; source attribution retained",
      alt: "Outdoor courts at Stagecoach Community Park",
    },
    {
      filename: "soccer-field.webp",
      imageUrl: "https://www.dimebasketball.org/images/blog/stagecoach-soccer.jpg",
      source: "https://www.dimebasketball.org/blog/discover-stagecoach-community-park-a-gem-in-carlsbads-crown",
      author: "Dime Basketball Club",
      license: "Local nonprofit sports photograph; source attribution retained",
      alt: "Synthetic turf soccer field and goal at Stagecoach Community Park",
    },
  ],
  "launch-ca-carlsbad-magee-park": [
    {
      filename: "magee-house-and-roses.webp",
      imageUrl: "https://i0.wp.com/coolsandiegosights.com/wp-content/uploads/2021/08/img_0529z.jpg?resize=1200%2C900&ssl=1",
      source: "https://coolsandiegosights.com/2021/08/04/history-and-beauty-at-magee-park-in-carlsbad/",
      author: "Richard Schulte / Cool San Diego Sights",
      license: "Credited local editorial photograph; source attribution retained",
      alt: "Historic barn and garden setting at Magee Park",
    },
    {
      filename: "twin-inns-gazebo.webp",
      imageUrl: "https://i0.wp.com/coolsandiegosights.com/wp-content/uploads/2021/08/img_0621z.jpg?resize=1200%2C900&ssl=1",
      source: "https://coolsandiegosights.com/2021/08/04/history-and-beauty-at-magee-park-in-carlsbad/",
      author: "Richard Schulte / Cool San Diego Sights",
      license: "Credited local editorial photograph; source attribution retained",
      alt: "Historic structure and gardens at Magee Park",
    },
  ],
  "launch-ca-carlsbad-agua-hedionda-lagoon-discovery-center": [
    {
      filename: "discovery-center.webp",
      imageUrl: "https://irp.cdn-website.com/839d186a/dms3rep/multi/opt/Image%2B-%2B2026-01-05T102555.682-1920w.jpg",
      source: "https://www.aguahedionda.org/the-discovery-campus",
      author: "Agua Hedionda Lagoon Foundation",
      license: "Official Agua Hedionda Lagoon Foundation photograph; source attribution retained",
      alt: "Pine Tree Play Zone obstacle course at the Agua Hedionda Discovery Campus",
      forceRefresh: true,
    },
    {
      filename: "lagoon-learning.webp",
      imageUrl: "https://irp.cdn-website.com/839d186a/dms3rep/multi/opt/Image%2B-%2B2024-07-26T124117.762-1920w.jpg",
      source: "https://www.aguahedionda.org/the-discovery-campus",
      author: "Agua Hedionda Lagoon Foundation",
      license: "Official Agua Hedionda Lagoon Foundation photograph; source attribution retained",
      alt: "Sea stars in the touch pool at the Agua Hedionda Discovery Campus",
      forceRefresh: true,
    },
  ],
  "launch-ca-oceanside-buddy-todd-park": [
    {
      filename: "basketball-court.webp",
      imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/4300/639100334196570000",
      source: "https://www.ci.oceanside.ca.us/government/parks-recreation/recreation-centers/buddy-todd-park-photo-album",
      author: "City of Oceanside",
      license: officialOceansideLicense,
      alt: "Outdoor basketball court and benches at Buddy Todd Park",
    },
    {
      filename: "overlook-path.webp",
      imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/4290/639100389362030000",
      source: "https://www.ci.oceanside.ca.us/government/parks-recreation/recreation-centers/buddy-todd-park-photo-album",
      author: "City of Oceanside",
      license: officialOceansideLicense,
      alt: "Paved path and hillside overlook at Buddy Todd Park",
    },
  ],
  "launch-ca-oceanside-heritage-park-village-and-museum": [
    {
      filename: "train-depot.webp",
      imageUrl: "https://kcet.brightspotcdn.com/dims4/default/b7f6007/2147483647/strip/true/crop/1920x1080%2B0%2B0/resize/848x477%21/quality/90/?url=http%3A%2F%2Fkcet-brightspot.s3.us-east-1.amazonaws.com%2Flegacy%2Fsites%2Fkl%2Ffiles%2Fthumbnails%2Fimage%2Fheritagepark4.jpg",
      source: "https://www.pbssocal.org/shows/socal-wanderer/five-must-see-historic-attractions-along-el-camino-real-californias-royal-road",
      author: "Sandi Hemmerlein / PBS SoCal",
      license: "Credited local editorial photograph; source attribution retained",
      alt: "Old train depot at Heritage Park Village and Museum",
    },
    {
      filename: "libby-schoolhouse.webp",
      imageUrl: "https://kcet.brightspotcdn.com/dims4/default/597a284/2147483647/strip/true/crop/1920x1080%2B0%2B0/resize/848x477%21/quality/90/?url=http%3A%2F%2Fkcet-brightspot.s3.us-east-1.amazonaws.com%2Flegacy%2Fsites%2Fkl%2Ffiles%2Fthumbnails%2Fimage%2Fheritagepark2.jpg",
      source: "https://www.pbssocal.org/shows/socal-wanderer/five-must-see-historic-attractions-along-el-camino-real-californias-royal-road",
      author: "Sandi Hemmerlein / PBS SoCal",
      license: "Credited local editorial photograph; source attribution retained",
      alt: "Libby Schoolhouse at Heritage Park Village and Museum",
    },
  ],
  "launch-ca-oceanside-mance-buchanon-park": [
    {
      filename: "sunset-field.webp",
      imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/3964/638120508770100000",
      source: "https://www.ci.oceanside.ca.us/government/mance-buchanon-park-photo-album",
      author: "City of Oceanside",
      license: officialOceansideLicense,
      alt: "Athletic field at sunset in Mance Buchanon Park",
    },
    {
      filename: "walking-loop.webp",
      imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/3961/638119684332100000",
      source: "https://www.ci.oceanside.ca.us/government/mance-buchanon-park-photo-album",
      author: "City of Oceanside",
      license: officialOceansideLicense,
      alt: "Developed walking route and park grounds at Mance Buchanon Park",
    },
  ],
  "launch-ca-oceanside-libby-lake-park": [
    {
      filename: "playground.webp",
      imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/4005/639102027019570000",
      source: "https://www.ci.oceanside.ca.us/government/parks-recreation/recreation-centers/libby-lake-park-photo-album",
      author: "City of Oceanside",
      license: officialOceansideLicense,
      alt: "Children's playground at Libby Lake Park",
    },
    {
      filename: "skatepark.webp",
      imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/3996/639102027753830000",
      source: "https://www.ci.oceanside.ca.us/government/parks-recreation/recreation-centers/libby-lake-park-photo-album",
      author: "City of Oceanside",
      license: officialOceansideLicense,
      alt: "Blacktop skatepark and recreation area at Libby Lake Park",
    },
  ],
  "launch-ca-oceanside-san-luis-rey-river-trail": [
    {
      filename: "trail-riders.webp",
      imageUrl: "https://media.sandiegoreader.com/img/photos/2017/05/22/San-Luis-Rey-River-Trail-bike-riders_t360.jpg",
      source: "https://www.sandiegoreader.com/news/2017/may/24/roam-flora-fauna-folks-san-luis-rey-river-trail/",
      author: "The Canyoneers / San Diego Reader",
      license: "Credited local editorial photograph; source attribution retained",
      alt: "Cyclists riding the paved San Luis Rey River Trail",
    },
    {
      filename: "river-wildlife.webp",
      imageUrl: "https://media.sandiegoreader.com/img/photos/2017/05/22/San-Luis-Rey-River-Juvenile-Night-Heron_t670.jpg",
      source: "https://www.sandiegoreader.com/news/2017/may/24/roam-flora-fauna-folks-san-luis-rey-river-trail/",
      author: "The Canyoneers / San Diego Reader",
      license: "Credited local editorial photograph; source attribution retained",
      alt: "Juvenile night heron in San Luis Rey River habitat beside the trail",
    },
  ],
  "launch-ca-oceanside-oak-riparian-park": [
    {
      filename: "park-view.webp",
      imageUrl: "https://s3-media0.fl.yelpcdn.com/bphoto/J-TgoPgvWrJSR9ynAI04pA/l.jpg?w=3840",
      source: "https://www.mapquest.com/us/california/oak-riparian-park-305857306",
      author: "MapQuest / Yelp community contributor",
      license: communityLicense,
      alt: "Open park and trail setting at Oak Riparian Park",
    },
    {
      filename: "playground.webp",
      imageUrl: "https://s3-media0.fl.yelpcdn.com/bphoto/y-nBJ4n8lTTgPrZion5nnA/l.jpg?w=3840",
      source: "https://www.mapquest.com/us/california/oak-riparian-park-305857306",
      author: "MapQuest / Yelp community contributor",
      license: communityLicense,
      alt: "Children's play area at Oak Riparian Park",
    },
  ],
  "launch-ca-oceanside-buena-vista-audubon-nature-center": [
    {
      filename: "lagoon-view.webp",
      imageUrl: "https://i0.wp.com/bvaudubon.org/wp-content/uploads/2016/01/BV-Lagoon-S.-Martin.jpg?w=2000&ssl=1",
      source: "https://bvaudubon.org/nature-center/",
      author: "S. Martin / Buena Vista Audubon Society",
      license: "Photograph published by Buena Vista Audubon Society; source attribution retained",
      alt: "Buena Vista Lagoon viewed from the Audubon Nature Center preserve",
    },
    {
      filename: "nature-trail.webp",
      imageUrl: "https://i0.wp.com/bvaudubon.org/wp-content/uploads/2016/06/BVAS-trail-N.-Shapiro-1.jpg?w=2000&ssl=1",
      source: "https://bvaudubon.org/nature-center/",
      author: "N. Shapiro / Buena Vista Audubon Society",
      license: "Photograph published by Buena Vista Audubon Society; source attribution retained",
      alt: "Native-plant trail at Buena Vista Audubon Nature Center",
    },
  ],
};

async function downloadPhoto(park, item) {
  const city = park.city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const relative = `${city}/${park.slug}/${item.filename}`;
  const outputPath = path.join(root, "assets", "parks", "san-diego-coast-galleries", relative);
  if (fs.existsSync(outputPath) && !item.forceRefresh) return `/assets/parks/san-diego-coast-galleries/${relative}`;
  if (!downloadImages) throw new Error(`Missing ${item.filename} for ${park.name}; rerun with --download`);
  let response;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    response = await fetch(item.imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/127 Safari/537.36 AuditMap/1.0",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: item.source,
      },
    });
    if (response.ok || response.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
  }
  if (!response?.ok) throw new Error(`${park.name} / ${item.filename}: image returned ${response?.status || "no response"}`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true })
    .webp({ quality: 83 })
    .toFile(outputPath);
  return `/assets/parks/san-diego-coast-galleries/${relative}`;
}

function uniqueImages(images) {
  return [...new Map((images || []).filter(Boolean).map((image) => [image.url, image])).values()];
}

async function main() {
  const allPath = path.join(root, "data", "generated", "all-subsites-ready.json");
  const pilotPath = path.join(root, "data", "generated", "pilot-subsites-ready.json");
  const campaignPath = path.join(root, "data", "parent-park-information-enrichment-campaign.json");
  const all = JSON.parse(fs.readFileSync(allPath, "utf8"));
  const pilot = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
  const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));

  let added = 0;
  for (const [parkId, items] of Object.entries(galleries)) {
    const park = all.parks.find((candidate) => candidate.id === parkId);
    if (!park) throw new Error(`Missing park ${parkId}`);
    const images = [];
    for (const item of items) {
      const localUrl = await downloadPhoto(park, item);
      images.push({
        url: localUrl,
        source: item.source,
        author: item.author,
        license: item.license,
        alt: item.alt,
        latitude: park.latitude,
        longitude: park.longitude,
        positionQuality: "Associated with this named destination by its cited source; exact camera coordinates are not published",
      });
      added += 1;
    }
    campaign.parks[parkId] ||= {};
    campaign.parks[parkId].additionalImages = uniqueImages([...(campaign.parks[parkId].additionalImages || []), ...images]);
    campaign.parks[parkId].verifiedAt = checkedAt;
    for (const document of [all, pilot]) {
      const record = document.parks.find((candidate) => candidate.id === parkId);
      if (record) record.verifiedAt = checkedAt;
    }
  }

  fs.writeFileSync(allPath, `${JSON.stringify(all, null, 2)}\n`);
  fs.writeFileSync(pilotPath, `${JSON.stringify(pilot, null, 2)}\n`);
  fs.writeFileSync(campaignPath, `${JSON.stringify(campaign, null, 2)}\n`);
  console.log(`Added ${added} sourced photographs across ${Object.keys(galleries).length} coast guides.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
