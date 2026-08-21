const fs = require("node:fs/promises");
const path = require("node:path");

const images = [
  ["apollo-heights-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2020-12/apollo-heights-park-basketball-courts-players.jpg"],
  ["caraleigh-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2026-06/CaraleighParkArt01.jpg"],
  ["baileywick-park-dog-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/styles/16_9_1440x810/public/2024-04/baileywick-dog.jpg"],
  ["buffaloe-road-dog-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/styles/max_710x710/public/2020-02/buffaloe-road-park-dog-park.jpg"],
  ["carolina-pines-dog-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/styles/16_9_1440x810/public/2020-02/carolina-pines-park77.jpg"],
  ["dix-park-dog-park", "hero.webp", "https://dixpark.org/sites/default/files/styles/desktop_1920w_1142h/public/2025-03/2022_yappy_hour_00024.jpg.webp"],
  ["dix-park-dog-park", "dog-at-yappy-hour.webp", "https://dixpark.org/sites/default/files/styles/desktop_1920w_1142h/public/2025-03/2022_yappy_hour_00167.jpg.webp"],
  ["dix-park-dog-park", "shaded-gathering.webp", "https://dixpark.org/sites/default/files/styles/desktop_1920w_1142h/public/2025-03/2022_yappy_hour_00316.jpg.webp"],
  ["davie-street-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2022-07/davie-street-playground.jpg"],
  ["eliza-pool-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2019-12/diverse-group-kids-soccer-open-field-parks.jpg"],
  ["glen-eden-pilot-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2020-02/glen-eden-park.jpg"],
  ["lassiter-mill-park", "dam-from-creek-bank.jpg", "https://raleighparks.files.wordpress.com/2011/06/p1000299.jpg"],
  ["lassiter-mill-park", "historic-mill-remnants.jpg", "https://raleighparks.files.wordpress.com/2011/06/p1000303.jpg"],
  ["jaycee-dog-run", "hero.jpg", "https://raleighnc.gov/sites/default/files/styles/max_710x710/public/2020-03/ic3a0916.jpg"],
  ["kiwanis-park-dog-run", "hero.jpg", "https://raleighnc.gov/sites/default/files/styles/max_710x710/public/2020-03/kiwanis-dog-run.jpg"],
  ["millbrook-exchange-dog-park", "wooded-play-area.webp", "https://images.squarespace-cdn.com/content/v1/642db893345aa931c802e170/455a8196-29d5-4002-9623-f98f3e9edad4/Millbrook+Dog+Park+-+2.jpg"],
  ["millbrook-exchange-dog-park", "large-dog-section.webp", "https://images.squarespace-cdn.com/content/v1/642db893345aa931c802e170/3b3aeb97-b712-4944-82a8-139d8917f3b6/Millbrook+Dog+Park+-+3+Big.jpg"],
  ["millbrook-exchange-dog-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/styles/max_710x710/public/2020-02/dog-smiling-millbrook-dog-parks.jpg"],
  ["mary-belle-pate-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2019-12/girl-climbing-rope-mary-belle-pate-parks.jpg"],
  ["marshall-memorial-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2021-10/raleigh-parks-marshall-memorial-park.jpg"],
  ["north-carolina-freedom-park", "hero.webp", "https://ncfreedompark.com/wp-content/uploads/2023/06/830466_000_N79_highres.jpg"],
  ["north-carolina-freedom-park", "quotation-walls.webp", "https://ncfreedompark.com/wp-content/uploads/2025/09/830466_000_N74_highres-1280x960-1.jpg"],
  ["north-carolina-freedom-park", "visitor-paths.webp", "https://ncfreedompark.com/wp-content/uploads/2025/09/830466_000_N95_highres-1280x960-1.jpg"],
  ["north-carolina-museum-of-history", "hero.jpg", "https://files.nc.gov/dncr/images/2025-08/02_NCMOH%20NW.jpg?VersionId=ENOIDAYLoKLgXzUN8DTGci6v4Dxhi9p_"],
  ["north-carolina-museum-of-history", "reimagined-museum.png", "https://files.nc.gov/dc-ncmoh/styles/site_page_main_image/public/images/2026-05/03_NCMOH%20Mall.png?VersionId=CaZlZ.nJeHOxph4ZVkwr1TsQ0pgC2rkT&itok=PnbC8YCs"],
  ["north-carolina-museum-of-history", "hall-of-history.jpg", "https://files.nc.gov/dc-ncmoh/styles/_inline_extra_large_/public/images/2026-05/MOH_Hall_of_History.jpg?VersionId=cOn5I.53YBPyIy2mT3Riplryifr5WqRd&itok=IoI8capk"],
  ["north-carolina-museum-of-natural-sciences", "hero.jpg", "https://www.naturalsciences.org/images/visit/visit_header.jpg"],
  ["north-carolina-museum-of-natural-sciences", "nature-exploration-center.png", "https://www.naturalsciences.org/images/visit/nec_leftcol.png"],
  ["north-carolina-museum-of-natural-sciences", "nature-research-center.png", "https://www.naturalsciences.org/images/visit/nrc_leftcol.png"],
  ["north-hills-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2021-10/raleigh-parks-north-hills-park.jpg"],
  ["oakwood-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2020-02/oakwood-park.jpg"],
  ["oakwood-dog-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2020-02/oakwood-park.jpg"],
  ["pender-street-park", "hero.jpg", "https://publicinput.com/img/exbmua7ywspzfomyiqog_1000_1000.JPG"],
  ["pender-street-park", "improvement-plan.jpg", "https://publicinput.com/img/lpykmhczj2wltcy7xfkm_1000_1000.JPG"],
  ["pender-street-park", "context-plan.jpg", "https://publicinput.com/img/ytusetwhz5wnjcpdmmlm_1000_1000.JPG"],
  ["quarry-street-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2021-10/raleigh-parks-quarry-street-park-2.jpg"],
  ["raleigh-rose-garden", "hero.jpg", "https://raleighlittletheatre.org/wp-content/uploads/2023/03/Rose-Garden-Sept-2022-1-2048x1536.jpg"],
  ["raleigh-rose-garden", "rose-blooms.jpg", "https://raleighlittletheatre.org/wp-content/uploads/2021/05/IMG_9915-2048x1536.jpg"],
  ["raleigh-rose-garden", "garden-aerial.jpg", "https://raleighlittletheatre.org/wp-content/uploads/2021/02/DJI_0032-2048x1536.jpg"],
  ["raleighs-smallest-park", "hero.jpg", "https://images.wral.com/asset/entertainment/out_and_about/2023/06/15/20911521/murals_of_raleigh-DMID1-5z97lmjlt-640x360.jpg"],
  ["raleighs-smallest-park", "mushroom-seating.jpg", "https://images.wral.com/asset/entertainment/out_and_about/2023/06/15/20911520/visit_raleighs_smallest_park-DMID1-5z97iozzj-640x480.jpg"],
  ["raleighs-smallest-park", "interactive-installation.jpg", "https://images.wral.com/asset/entertainment/out_and_about/2023/06/15/20911519/small_raleigh_park_mural-DMID1-5z97iozzz-640x480.jpg"],
  ["roanoke-park", "wral-report.jpg", "https://images.wral.com/asset/news/local/2023/10/03/21079975/3196005-matt_430p-DMID1-60gzw5144-640x360.jpg"],
  ["roberts-park-dog-run", "hero.jpg", "https://raleighnc.gov/sites/default/files/styles/max_710x710/public/2024-07/dog-park-roberts.jpg"],
  ["ridge-road-pool", "hero.jpg", "https://raleighnc.gov/sites/default/files/2019-11/family-shooting-hoops-ridge-road-pool-aquatics-parks.jpg"],
  ["southgate-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2021-10/raleigh-parks-southgate-park.jpg"],
  ["varnell-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2021-10/raleigh-varnell-park.jpg"],
  ["worthdale-park", "hero.jpg", "https://raleighnc.gov/sites/default/files/2020-03/worthdale-park-community-center-main.jpg"],
  ["wral-azalea-gardens", "hero.webp", "https://images.squarespace-cdn.com/content/v1/64595bcecc15ee3eb70fff16/7eb1b014-cd48-482b-be6b-cbcf3d47e30e/Gardens-28.jpg"],
  ["wral-azalea-gardens", "landscape-view.webp", "https://images.squarespace-cdn.com/content/v1/64595bcecc15ee3eb70fff16/a4a6cf1b-30a5-48c5-8372-5f299e05de34/Gardens-36.jpg"],
  ["wral-azalea-gardens", "garden-installation.webp", "https://images.squarespace-cdn.com/content/v1/64595bcecc15ee3eb70fff16/1687192991848-Y7790ZFCENHUIZOK5B1N/Gardens-121.jpg"],
];

async function main() {
  const results = [];

  for (const [slug, filename, url] of images) {
    const directory = path.join("assets", "parks", "nc", "raleigh", slug);
    const outputPath = path.join(directory, filename);
    try {
      await fs.access(outputPath);
      results.push({ slug, filename, skipped: true });
      continue;
    } catch {
      // The source has not been localized yet.
    }

    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
        "User-Agent": "Mozilla/5.0 AuditMap image localization (https://www.auditmap.org)",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) {
      throw new Error(`${slug}: HTTP ${response.status}, ${contentType || "no content type"}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(outputPath, bytes);
    results.push({ slug, filename, bytes: bytes.length, contentType });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
