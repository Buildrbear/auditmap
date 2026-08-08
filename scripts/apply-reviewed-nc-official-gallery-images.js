const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const candidateDoc = JSON.parse(fs.readFileSync(path.join(root, "data", "photo-research", "nc-official-gallery-candidates.json"), "utf8"));
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data", "parent-park-information-enrichment-campaign.json"), "utf8")).parks;
const enrichmentPath = path.join(root, "data", "generated", "launch-park-enrichment.json");
const enrichment = JSON.parse(fs.readFileSync(enrichmentPath, "utf8"));
const records = new Map(enrichment.parks.map((place) => [place.id, place]));
const candidates = new Map(candidateDoc.places.map((place) => [place.id, place.candidates]));
const selections = {
  "launch-nc-apex-pleasant-park": [0, 1],
  "launch-nc-burlington-arboretum-at-willowbrook-park": [0, 1, 2],
  "launch-nc-burlington-lake-cammack-park-and-marina": [0],
  "launch-nc-concord-brown-mill-mountain-bike-trail-park": [0],
  "launch-nc-concord-james-l-dorton-park": [1, 0, 3],
  "launch-nc-concord-mceachern-greenway": [0],
  "launch-nc-gastonia-rankin-lake-park": [0, 1, 2],
  "launch-nc-greenville-wildwood-park": [0, 1],
  "launch-nc-high-point-high-point-city-lake-park": [2],
  "launch-nc-high-point-high-point-greenway": [2],
  "launch-nc-high-point-oak-hollow-park": [0],
  "launch-nc-high-point-piedmont-environmental-center": [2],
  "launch-nc-jacksonville-jacksonville-commons-recreation-complex": [0],
  "launch-nc-winston-salem-salem-lake-park": [0]
};
const directSelections = {
  "launch-nc-asheville-carrier-park": [
    { url: "https://www.ashevillenc.gov/wp-content/uploads/2024/08/Carrier_Park_Playground_Online_Banner.png", source: "https://www.ashevillenc.gov/locations/carrier-park/", author: "City of Asheville", license: "Official City of Asheville image", alt: "Children exploring the castle-themed playground at Carrier Park" },
    { url: "https://www.ashevillenc.gov/wp-content/uploads/2022/12/Carrier_Park_Asheville_LoRes.png", source: "https://www.ashevillenc.gov/locations/carrier-park/", author: "City of Asheville", license: "Official City of Asheville image", alt: "Inline skater using the paved velodrome loop at Carrier Park" }
  ],
  "launch-nc-asheville-french-broad-river-park": [
    { url: "https://www.ashevillenc.gov/wp-content/uploads/2024/08/French_Broad_River_Dog_Park_Asheville_LoRes.png", source: "https://www.ashevillenc.gov/news/park-views-french-broad-river-park-and-frend-broad-river-greenway/", author: "City of Asheville", license: "Official City of Asheville image", alt: "Separate small-dog area at French Broad River Dog Park" },
    { url: "https://www.ashevillenc.gov/wp-content/uploads/2024/08/French_Broad_River_Park_Entrance_LoRes.png", source: "https://www.ashevillenc.gov/news/park-views-french-broad-river-park-and-frend-broad-river-greenway/", author: "City of Asheville", license: "Official City of Asheville image", alt: "French Broad River Park entrance monument framed by autumn trees" }
  ],
  "launch-nc-asheville-richmond-hill-park": [
    { url: "https://www.ashevillenc.gov/wp-content/uploads/2024/06/Richmond_Hill_Park_Trails_Asheville_Hike_LoRes.png", source: "https://www.ashevillenc.gov/locations/richmond-hill-park/", author: "City of Asheville", license: "Official City of Asheville image", alt: "Wooded bike-park trail entrance and orientation sign at Richmond Hill Park" },
    { url: "https://www.ashevillenc.gov/wp-content/uploads/2018/10/Richmond_Hill_Disc_Golf-e1538678983523.jpg", source: "https://www.ashevillenc.gov/locations/richmond-hill-park/", author: "City of Asheville", license: "Official City of Asheville image", alt: "Disc-golf basket on the wooded Richmond Hill Park course" }
  ],
  "launch-nc-asheville-western-north-carolina-nature-center": [
    { url: "https://upload.wikimedia.org/wikipedia/commons/6/6e/North_American_river_otter_captivity.jpeg", source: "https://commons.wikimedia.org/wiki/File:North_American_river_otter_captivity.jpeg", author: "Johanna", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", alt: "North American river otters resting in their habitat at the WNC Nature Center" },
    { url: "https://upload.wikimedia.org/wikipedia/commons/d/da/Ursus_americanus_in_captivity.jpeg", source: "https://commons.wikimedia.org/wiki/File:Ursus_americanus_in_captivity.jpeg", author: "Johanna", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", alt: "American black bear in its habitat at the WNC Nature Center" }
  ],
  "launch-nc-apex-apex-community-park": [
    { url: "https://www.apexnc.org/ImageRepository/Document?documentID=52902", source: "https://www.apexnc.org/795/Apex-Community-Park", author: "Town of Apex", license: "Official Town of Apex image", alt: "Official Apex Community Park map showing entrances, parking, trails, courts, restrooms, and lake access" },
    { url: "https://www.apexnc.org/ImageRepository/Document?documentId=54994", source: "https://www.apexnc.org/795/Apex-Community-Park", author: "Town of Apex", license: "Official Town of Apex image", alt: "Aerial view of the current wooded playground at Apex Community Park" }
  ],
  "launch-nc-apex-kelly-road-park": [
    { url: "https://www.apexnc.org/ImageRepository/Document?documentID=28591", source: "https://www.apexnc.org/799/Kelly-Road-Park", author: "Town of Apex", license: "Official Town of Apex image", alt: "Wide aerial view of the KidsTowne playground, swings, paths, and picnic tables at Kelly Road Park" },
    { url: "https://exploreapexnc.com/wp-content/uploads/elementor/thumbs/2019-Kelly-Road-Park-Renovation-2-rotated-qp82ki56qfqfukhb006sdlbcmm6gs1q5dbpd62zctc.jpg", source: "https://exploreapexnc.com/parks/", author: "Explore Apex", license: "Official Explore Apex tourism image", alt: "Swings, accessible paths, picnic tables, and castle-themed play equipment at Kelly Road Park" }
  ],
  "launch-nc-apex-pleasant-park": [
    { url: "https://exploreapexnc.com/wp-content/uploads/elementor/thumbs/2023.10.10-Pleasant-Park-Aerial_web-qp82m3hcbbwxis60p6z13ougv4butl1rx7hzfymc9s.jpg", source: "https://exploreapexnc.com/parks/", author: "Explore Apex", license: "Official Explore Apex tourism image", alt: "Aerial view of the Enchanted Forest playground and athletic fields at Pleasant Park" }
  ],
  "launch-nc-fayetteville-cape-fear-river-trail": [
    { url: "https://cloudfront.traillink.com/photos/cape-fear-river-trail_86807_lg.jpg", source: "https://www.traillink.com/trail-photo/cape-fear-river-trail_86807/", author: "daveconnelly via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Trail users crossing the layered Cape Fear River Trail boardwalk beneath an active rail line" }
  ],
  "launch-nc-fayetteville-lake-rim-park": [
    { url: "https://live.staticflickr.com/65535/50482928217_295bc0cbc4_h.jpg", source: "https://www.flickr.com/photos/fayettevillenc/50482928217/", author: "City of Fayetteville", license: "Official City of Fayetteville image", alt: "Aerial view of the seasonal Lake Rim aquatics facility adjacent to Lake Rim Park" },
    { url: "https://live.staticflickr.com/65535/50482764781_53005dffa3_z.jpg", source: "https://www.flickr.com/photos/fayettevillenc/50482764781/", author: "City of Fayetteville", license: "Official City of Fayetteville image", alt: "Shallow play pool, water features, and slides at the seasonal Lake Rim aquatics facility" }
  ],
  "launch-nc-fayetteville-festival-park": [
    { url: "https://live.staticflickr.com/65535/55378130044_465afa0922_z.jpg", source: "https://www.flickr.com/photos/fayettevillenc/55378130044/", author: "City of Fayetteville; photo by Tony Wooten", license: "Official City of Fayetteville image", alt: "Audience gathered on the Festival Park lawn facing the main stage" },
    { url: "https://live.staticflickr.com/65535/55377012512_4959eb5ccf_z.jpg", source: "https://www.flickr.com/photos/fayettevillenc/55377012512/", author: "City of Fayetteville; photo by Tony Wooten", license: "Official City of Fayetteville image", alt: "Festival Park main stage prepared for an Independence Day concert" },
    { url: "https://live.staticflickr.com/65535/55377012642_26d07ec1da_z.jpg", source: "https://www.flickr.com/photos/fayettevillenc/55377012642/", author: "City of Fayetteville; photo by Tony Wooten", license: "Official City of Fayetteville image", alt: "Family enjoying a community event on the Festival Park lawn" }
  ],
  "launch-nc-fayetteville-mazarick-park": [
    { url: "/assets/parks/nc/fayetteville/mazarick-park/wooded-playground.jpg", source: "https://wanderlog.com/place/details/7663171/mazarick-park", author: "Reviewed Google contributor via Wanderlog", license: "Reviewed community image via Wanderlog", alt: "Blue-and-green playground equipment beneath tall pines at Mazarick Park" },
    { url: "/assets/parks/nc/fayetteville/mazarick-park/glenville-lake.jpg", source: "https://www.tripadvisor.com/Attraction_Review-g49136-d278959-Reviews-Mazerick_Park-Fayetteville_North_Carolina.html", author: "Kris F via Tripadvisor", license: "Reviewed community image via Tripadvisor", alt: "Glenville Lake viewed through shaded trees at Mazarick Park" }
  ],
  "launch-nc-fayetteville-j-bayard-clark-park-and-nature-center": [
    { url: "https://live.staticflickr.com/65535/50472457417_8fd78c11c6_b.jpg", source: "https://www.flickr.com/photos/161404054@N07/50472457417/", author: "City of Fayetteville", license: "Official City of Fayetteville image", alt: "Clark Park trail wayfinding sign pointing to the StoryWalk and waterfall" },
    { url: "https://live.staticflickr.com/65535/50472455222_e31263d779_z.jpg", source: "https://www.flickr.com/photos/161404054@N07/50472455222/", author: "City of Fayetteville", license: "Official City of Fayetteville image", alt: "STEM StoryWalk panel beside a wooded bridge at Clark Park" }
  ],
  "launch-nc-durham-american-tobacco-trail": [
    { url: "https://cloudfront.traillink.com/photos/american-tobacco-trail_216749_lg.jpg", source: "https://www.traillink.com/trail-photo/american-tobacco-trail_216749/", author: "daveconnelly via TrailLink; photo by Angela Hollowell", license: "Reviewed community photo via TrailLink", alt: "Cyclists using the paved American Tobacco Trail near mile marker 8 in Durham" },
    { url: "https://cloudfront.traillink.com/photos/american-tobacco-trail_66909_lg.jpg", source: "https://www.traillink.com/trail-photo/american-tobacco-trail_66909/", author: "sprinkhaan_1 via TrailLink", license: "Reviewed community photo via TrailLink", alt: "American Tobacco Trail bicycle and pedestrian bridge over Interstate 40 near Southpoint" },
    { url: "https://cloudfront.traillink.com/photos/american-tobacco-trail_287355_lg.jpg", source: "https://www.traillink.com/trail-photo/american-tobacco-trail_287355/", author: "omahadivision via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Aerial view of the American Tobacco Trail corridor through Durham neighborhoods" }
  ],
  "launch-nc-durham-west-point-on-the-eno": [
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=437", source: "https://www.dprplaymore.org/Facilities/Facility/Details/West-Point-on-the-Eno-76", alt: "Historic McCown-Mangum House at West Point on the Eno" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=438", source: "https://www.dprplaymore.org/Facilities/Facility/Details/West-Point-on-the-Eno-76", alt: "Historic West Point grist mill beside the Eno River" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=439", source: "https://www.dprplaymore.org/Facilities/Facility/Details/West-Point-on-the-Eno-76", alt: "Wooded historic mill structure at West Point on the Eno" }
  ],
  "launch-nc-durham-durham-central-park": [
    { url: "https://durhamcentralpark.org/content/uploads/67279295_10156476285874352_2670359701123760128_n-1.jpg", source: "https://durhamcentralpark.org/mount-merrill/", author: "Durham Central Park, Inc.", license: "Official Durham Central Park, Inc. image", alt: "Children using the Mount Merrill slides and climbing boulders at Durham Central Park" },
    { url: "https://durhamcentralpark.org/content/uploads/8894832999_8150cf3c95_o.jpg", source: "https://durhamcentralpark.org/about/", author: "Durham Central Park, Inc.", license: "Official Durham Central Park, Inc. image", alt: "Family walking across the pedestrian bridge at Durham Central Park" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=169", source: "https://www.dprplaymore.org/Facilities/Facility/Details/Durham-Central-Park-18", author: "Durham Parks and Recreation", license: "Official Durham Parks and Recreation image", alt: "Durham Central Park entrance, pavilion, and play area along Foster Street" }
  ],
  "launch-nc-durham-forest-hills-park": [
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=193", source: "https://www.dprplaymore.org/186/Forest-Hills-Park", alt: "Playground and seasonal sprayground at Forest Hills Park" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=192", source: "https://www.dprplaymore.org/186/Forest-Hills-Park", alt: "Tennis and pickleball courts at Forest Hills Park" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=191", source: "https://www.dprplaymore.org/186/Forest-Hills-Park", alt: "Large picnic shelter at Forest Hills Park" }
  ],
  "launch-nc-durham-lake-michie-park-and-marina": [
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=237", source: "https://www.dprplaymore.org/Facilities/Facility/Details/Lake-Michie-Boathouse-38", alt: "Visitors sailing on Lake Michie near the park and marina" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=238", source: "https://www.dprplaymore.org/Facilities/Facility/Details/Lake-Michie-Boathouse-38", alt: "Morning mist over Lake Michie" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=239", source: "https://www.dprplaymore.org/Facilities/Facility/Details/Lake-Michie-Boathouse-38", alt: "Open water and wooded shoreline at Lake Michie" }
  ],
  "launch-nc-durham-leigh-farm-park": [
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=242", source: "https://www.dprplaymore.org/204/Leigh-Farm-Park", alt: "Visitors walking toward the historic Leigh Farm log cabin" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=241", source: "https://www.dprplaymore.org/204/Leigh-Farm-Park", alt: "Historic Leigh family farmhouse beneath mature shade trees" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=243", source: "https://www.dprplaymore.org/204/Leigh-Farm-Park", alt: "Small historic log outbuilding at Leigh Farm Park" }
  ],
  "launch-nc-durham-rock-quarry-park": [
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=3928", source: "https://www.dprplaymore.org/618/Rock-Quarry-Park-Event-Space", alt: "Large community festival at Rock Quarry Park event space" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=344", source: "https://www.dprplaymore.org/Facilities/Facility/Details/Rock-Quarry-Park-60", alt: "Paved path, gazebo, and courts at Rock Quarry Park" },
    { url: "https://www.dprplaymore.org/ImageRepository/Document?documentID=342", source: "https://www.dprplaymore.org/Facilities/Facility/Details/Rock-Quarry-Park-60", alt: "Open event lawn bordered by woods at Rock Quarry Park" }
  ],
  "launch-nc-cary-jack-smith-park": [
    { url: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/raleigh/DJI_00880-88311afde5ee36f_88311ce4-b149-1c5a-eccbc7ce078b16a5.jpg", source: "https://www.visitraleigh.com/listing/jack-smith-park/70075/", author: "Visit Raleigh", license: "Official Visit Raleigh image", alt: "Aerial view of Jack Smith Park showing the playground, sprayground, climbing boulder, shelter, and parking" },
    { url: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/raleigh/DJI_00840-883295deb7aedb3_8832984a-dfd3-6b4b-e24dc3fffa8fcbca.jpg", source: "https://www.visitraleigh.com/listing/jack-smith-park/70075/", author: "Visit Raleigh", license: "Official Visit Raleigh image", alt: "Climbing boulder and nature-play landscape at Jack Smith Park" },
    { url: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/raleigh/637667934780870000_69330438-E85C-C03C-7F829B6263BFD14F-69330226a60a8ef_69330a84-95fb-9e65-d057198f14811c98.jpg", source: "https://www.visitraleigh.com/listing/jack-smith-park/70075/", author: "Visit Raleigh", license: "Official Visit Raleigh image", alt: "Jack Smith Park wayfinding sign for the dog park, play area, sprayground, and picnic shelter" }
  ],
  "launch-nc-cary-downtown-cary-park": [
    { url: "https://e1.nmcdn.io/carypark/wp-content/uploads/2023/06/TheNest-scaled.jpg/v:-dynamic:1-aspect:1-fit:cover-gravity:center/TheNest-scaled--600.webp", source: "https://downtowncarypark.com/welcome-to-downtown-cary-park", author: "Downtown Cary Park", license: "Official Downtown Cary Park image", alt: "Children climbing the two cardinal play structures at The Nest in Downtown Cary Park" },
    { url: "https://e1.nmcdn.io/carypark/wp-content/uploads/2023/06/Tieredwaterfeature-scaled.jpg/v:-dynamic:1-aspect:1-fit:cover-gravity:center/Tieredwaterfeature-scaled--600.webp", source: "https://downtowncarypark.com/welcome-to-downtown-cary-park", author: "Downtown Cary Park", license: "Official Downtown Cary Park image", alt: "Tiered water feature and pedestrian bridge at Downtown Cary Park" },
    { url: "https://e1.nmcdn.io/carypark/wp-content/uploads/2023/07/BarkyardNEW-scaled.jpg/v:-dynamic:1-aspect:1-fit:cover-gravity:center/BarkyardNEW-scaled--600.webp", source: "https://downtowncarypark.com/welcome-to-downtown-cary-park", author: "Downtown Cary Park", license: "Official Downtown Cary Park image", alt: "Dogs using the tunnels, logs, and turf at the Barkyard in Downtown Cary Park" }
  ],
  "launch-nc-cary-fred-g-bond-metro-park": [
    { url: "https://www.carync.gov/home/showimage?id=1900", source: "https://www.carync.gov/recreation-enjoyment/parks-greenways-environment/parks/fred-g-bond-metro-park", author: "Town of Cary", license: "Official Town of Cary image", alt: "Bond Lake and the wooded shoreline at Fred G. Bond Metro Park" },
    { url: "https://www.carync.gov/home/showimage?id=4601", source: "https://www.carync.gov/recreation-enjoyment/parks-greenways-environment/parks/fred-g-bond-metro-park", author: "Town of Cary", license: "Official Town of Cary image", alt: "Bond Park Boathouse nestled among the pines on the Bond Lake waterfront" }
  ],
  "launch-nc-cary-hemlock-bluffs-nature-preserve": [
    { url: "https://www.nctripping.com/wp-content/uploads/2020/05/NC-Nature-Hemlock-Bluffs-Nature-Preserve-Cary-Wake-County.jpg", source: "https://www.nctripping.com/hemlock-bluffs-nature-preserve-cary/", author: "NC Tripping", license: "Reviewed visitor-guide image", alt: "Mulched trail and boardwalk through Hemlock Bluffs Nature Preserve" },
    { url: "https://www.nctripping.com/wp-content/uploads/2020/05/Stevens-Nature-Center-and-Childrens-Garden-at-Hemlock-Bluffs-Cary.jpg", source: "https://www.nctripping.com/hemlock-bluffs-nature-preserve-cary/", author: "NC Tripping", license: "Reviewed visitor-guide image", alt: "Stevens Nature Center and children's nature garden at Hemlock Bluffs" }
  ],
  "launch-nc-cary-black-creek-greenway": [
    { url: "https://www.carync.gov/home/showpublishedimage/2338/636069597109670000", source: "https://www.carync.gov/recreation-enjoyment/parks-greenways-environment/greenways/black-creek-greenway", author: "Town of Cary", license: "Official Town of Cary image", alt: "Cyclist on the paved Black Creek Greenway beside a wooded lake" },
    { url: "https://thecaryreport.com/wp-content/uploads/2023/06/IMG_0105.jpeg", source: "https://thecaryreport.com/black-creek-greenway-section-reopens-connecting-to-lake-crabtree", author: "The Cary Report", license: "Reviewed local-news image", alt: "Black Creek Greenway boardwalk on the connection toward Lake Crabtree" }
  ],
  "launch-nc-charlotte-mcalpine-creek-community-park": [
    { url: "/assets/parks/nc/charlotte/mcalpine-creek-community-park/fishing-lake.jpg", source: "https://moraclt.org/live-and-shop/parks-hidden-treasures/", author: "Monroe Road Advocates", license: "Reviewed local community image", alt: "McAlpine Creek Park fishing lake, pier, shoreline path, and autumn trees reflected in the water" },
    { url: "/assets/parks/nc/charlotte/mcalpine-creek-community-park/wetland-wildlife.jpg", source: "https://www.flickr.com/photos/150964093@N06/albums/72157687706372024/", author: "NC Wetlands", license: "Reviewed NC Wetlands field image", alt: "Great egret perched above the wetland habitat at McAlpine Creek Park" }
  ],
  "launch-nc-charlotte-reedy-creek-park-and-nature-center": [
    { url: "/assets/parks/nc/charlotte/reedy-creek-park-and-nature-center/play-60-fitness-course.jpg", source: "https://www.flickr.com/photos/96965449@N07/albums/72157688603847366", author: "Cunningham Recreation", license: "Reviewed project image", alt: "Aerial view of the Panthers Play 60 fitness and obstacle course at Reedy Creek Park" }
  ],
  "launch-nc-danbury-hanging-rock-state-park": [
    { url: "/assets/parks/nc/danbury/hanging-rock-state-park/moores-knob-overlook.jpg", source: "https://commons.wikimedia.org/wiki/File:View_from_Moores_Knob_at_Hanging_Rock_State_Park.jpg", author: "bobistraveling", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", alt: "Rocky Moore's Knob overlook and layered Piedmont landscape at Hanging Rock State Park" }
  ],
  "launch-nc-nags-head-jockey-s-ridge-state-park": [
    { url: "/assets/parks/nc/nags-head/jockeys-ridge-state-park/hang-gliding.jpg", source: "https://commons.wikimedia.org/wiki/File:Hang_Glider_at_Jockey%27s_Ridge_State_Park.jpg", author: "bobistraveling", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", alt: "Student hang glider lifting from the sand at Jockey's Ridge State Park" }
  ],
  "launch-nc-burlington-burlington-city-park": [
    { url: "https://www.burlingtonnc.gov/ImageRepository/Document?documentId=24125", source: "https://www.burlingtonnc.gov/2881/Amusement-Rides", author: "City of Burlington", license: "Official City of Burlington image", alt: "Full view of the restored Dentzel Menagerie Carousel inside its pavilion at Burlington City Park" },
    { url: "https://www.burlingtonnc.gov/ImageRepository/Document?documentId=27883", source: "https://www.burlingtonnc.gov/2881/Amusement-Rides", author: "City of Burlington", license: "Official City of Burlington image", alt: "Families riding the miniature train through the wooded amusement area at Burlington City Park" }
  ],
  "launch-nc-burlington-lake-cammack-park-and-marina": [
    { url: "https://www.burlingtonnc.gov/ImageRepository/Path?filePath=/Documents/Content/361/720/0423%20SOAR%20Cammack%20(2)2_202005201028074857.jpg", source: "https://www.burlingtonnc.gov/1310/TrailsTracksGreenways", author: "City of Burlington", license: "Official City of Burlington image", alt: "Hikers approaching the Lake Cammack shoreline from the natural-surface park trail" },
    { url: "https://assets.simpleviewinc.com/simpleview/image/upload/c_limit,q_80,w_1200/v1/crm/visitalamance/lake0-43e009795056a36_43e00aba-5056-a36a-0ba80c8e084531b8.jpg", source: "https://www.visitalamance.com/listing/lake-cammack-%26-marina/479/", author: "Visit Alamance", license: "Official Visit Alamance tourism image", alt: "Paddlers crossing the calm, wooded water at Lake Cammack" }
  ],
  "launch-nc-burlington-lake-mackintosh-park-and-marina": [
    { url: "https://live.staticflickr.com/5498/9606515259_aa3e62a261_h.jpg", source: "https://www.flickr.com/photos/burlingtonnc/9606515259/in/album-72157635262225348", alt: "Children fishing from the shaded shoreline at Lake Mackintosh Park and Marina" },
    { url: "https://live.staticflickr.com/7288/9609745320_cae183efee_h.jpg", source: "https://www.flickr.com/photos/burlingtonnc/9609745320/in/album-72157635262225348", alt: "Young angler holding a freshly caught fish beside Lake Mackintosh" },
    { url: "https://live.staticflickr.com/2831/9609741626_202c75a09b_h.jpg", source: "https://www.flickr.com/photos/burlingtonnc/9609741626/in/album-72157635262225348", alt: "Families gathering with fishing rods under the shaded lakeside shelter at Lake Mackintosh" }
  ],
  "launch-nc-gastonia-avon-and-catawba-creek-greenway": [
    { url: "https://files.aptuitivcdn.com/JVXM9wad0E-1708/images/trails/trail-system/CatawbaCr-Amy-Moore-6-6-10-57.1773311125.jpg", source: "https://www.carolinathreadtrailmap.org/trails/trail/catawba-creek-greenway", alt: "Paved Avon and Catawba Creeks Greenway through a wooded corridor" },
    { url: "https://files.aptuitivcdn.com/JVXM9wad0E-1708/images/trails/trail-system/CatawbaCr-Amy-Moore-6-6-13-57.1773311125.jpg", source: "https://www.carolinathreadtrailmap.org/trails/trail/catawba-creek-greenway", alt: "Greenway bridge crossing along Avon and Catawba Creeks Greenway" },
    { url: "https://files.aptuitivcdn.com/JVXM9wad0E-1708/images/trails/trail-system/Avon-Cat_winter-1_Jane-Love-57.1773311125.jpg", source: "https://www.carolinathreadtrailmap.org/trails/trail/catawba-creek-greenway", alt: "Avon and Catawba Creeks Greenway after winter snow" }
  ],
  "launch-nc-gastonia-lineberger-park": [
    { url: "/assets/parks/nc/gastonia/lineberger-park/aerial-overview.jpg", source: "https://www.gogastonnc.org/post/explore-these-10-must-visit-parks-in-gaston-county", author: "Go Gaston NC", license: "Official Gaston County Tourism image", alt: "Aerial overview of Lineberger Park showing the miniature train, playgrounds, pool, splash pad, courts, shelters, and walking paths" },
    { url: "/assets/parks/nc/gastonia/lineberger-park/seasonal-pool.jpg", source: "https://www.gogastonnc.org/places/lineberger-park", author: "Go Gaston NC", license: "Official Gaston County Tourism image", alt: "Families using the seasonal pool, lazy river, water slide, and spray features at Lineberger Park" },
    { url: "/assets/parks/nc/gastonia/lineberger-park/splash-pad.jpg", source: "https://www.gastonianc.gov/lineberger-park.html", author: "City of Gastonia", license: "Official City of Gastonia image", alt: "Children playing among the fountains and colorful water features at Lineberger Park splash pad" }
  ],
  "launch-nc-gastonia-martha-rivers-park": [
    { url: "/assets/parks/nc/gastonia/martha-rivers-park/castle-playground.jpg", source: "https://www.gastonianc.gov/martha-rivers-park.html", author: "City of Gastonia", license: "Official City of Gastonia image", alt: "Families gathering beside the castle-themed playground and shaded lawn at Martha Rivers Park" },
    { url: "/assets/parks/nc/gastonia/martha-rivers-park/wooden-play-structures.jpg", source: "https://www.gastonianc.gov/martha-rivers-park.html", author: "City of Gastonia", license: "Official City of Gastonia image", alt: "Wooden towers, ramps, bridges, and slides inside the castle playground at Martha Rivers Park" },
    { url: "/assets/parks/nc/gastonia/martha-rivers-park/aerial-sports-complex.jpg", source: "https://www.gogastonnc.org/post/explore-these-10-must-visit-parks-in-gaston-county", author: "Go Gaston NC", license: "Official Gaston County Tourism image", alt: "Aerial overview of Martha Rivers Park showing soccer fields, ball fields, walking loops, parking, and wooded edges" }
  ],
  "launch-nc-greensboro-atlantic-and-yadkin-greenway": [
    { url: "https://cloudfront.traillink.com/photos/atlantic--yadkin-greenway_17766_hero.jpg", source: "https://www.traillink.com/trail/atlantic--yadkin-greenway/", author: "tayyarahdavidson via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Paved Atlantic and Yadkin Greenway approaching a trail bridge" },
    { url: "https://www.visitgreensboronc.com/_images/things-to-do-images/AY-Greenway-Web1.png", source: "https://www.visitgreensboronc.com/things-to-do/sports-recreation/greensboro-parks-and-recreation-trails-and-greenways.aspx", author: "Visit Greensboro; photo by Rob Landwehrmann", license: "Official Visit Greensboro tourism image", alt: "Four cyclists crossing a red bridge on the Atlantic and Yadkin Greenway" },
    { url: "https://www.visitgreensboronc.com/_images/things-to-do-images/AY-Greenway-Web5.png", source: "https://www.visitgreensboronc.com/things-to-do/sports-recreation/greensboro-parks-and-recreation-trails-and-greenways.aspx", author: "Visit Greensboro", license: "Official Visit Greensboro tourism image", alt: "Bicycles parked on an Atlantic and Yadkin Greenway bridge beside the lake" }
  ],
  "launch-nc-greensboro-lebauer-park": [
    { url: "https://www.visitgreensboronc.com/_images/things-to-do-images/carolyn-maurice-lebauer-park-impact.jpg", source: "https://www.visitgreensboronc.com/things-to-do/sports-recreation/carolyn-maurice-lebauer-park.aspx", author: "Visit Greensboro; photo by Scheib Creative", license: "Official Visit Greensboro tourism image", alt: "Child running through the seasonal interactive fountain at LeBauer Park" },
    { url: "https://www.visitgreensboronc.com/_images/things-to-do-images/carolyn-maurice-lebauer-park-image-12.jpg", source: "https://www.visitgreensboronc.com/things-to-do/sports-recreation/carolyn-maurice-lebauer-park.aspx", author: "Visit Greensboro; photo by Scheib Creative", license: "Official Visit Greensboro tourism image", alt: "Where We Met aerial sculpture illuminated above LeBauer Park's seating and lawn at night" }
  ],
  "launch-nc-greensboro-country-park": [
    { url: "https://www.visitgreensboronc.com/_images/blog-images/CVB-May-Topic_0012_CountryPark3.jpg", source: "https://visitgreensboronc.com/about-us/blog/greensboro-playgrounds.aspx", author: "Visit Greensboro", license: "Official Visit Greensboro tourism image", alt: "Colorful duck, swan, and dragon pedal boats available seasonally at Country Park" }
  ],
  "launch-nc-greensboro-greensboro-arboretum": [
    { url: "https://www.visitgreensboronc.com/_images/things-to-do-images/the-greensboro-arboretum-impact.jpg", source: "https://www.visitgreensboronc.com/things-to-do/sports-recreation/the-greensboro-arboretum.aspx", author: "Visit Greensboro", license: "Official Visit Greensboro tourism image", alt: "Flowering perennial beds and vine arbors along the paved Greensboro Arboretum path" }
  ],
  "launch-nc-greensboro-bog-garden-at-benjamin-park": [
    { url: "/assets/parks/nc/greensboro/bog-garden-boardwalk.jpeg", source: "https://greensborobeautiful.org/gardens/bog-garden/", author: "Greensboro Beautiful", license: "Official Greensboro Beautiful image", alt: "Elevated wooden boardwalk winding through the shaded wetland forest at Bog Garden" }
  ],
  "launch-nc-greensboro-greensboro-downtown-greenway": [
    { url: "https://www.visitgreensboronc.com/_images/things-to-do-images/Downtown-Greenway-Web3.png", source: "https://www.visitgreensboronc.com/things-to-do/sports-recreation/greensboro-parks-and-recreation-trails-and-greenways.aspx", author: "Visit Greensboro", license: "Official Visit Greensboro tourism image", alt: "Gateway of the Open Book public art marking an entrance to Greensboro Downtown Greenway" }
  ],
  "launch-nc-greensboro-keeley-park": [
    { url: "https://www.visitgreensboronc.com/_images/things-to-do-images/Keeley-Park-Splash-Pad.jpg", source: "https://www.visitgreensboronc.com/things-to-do/sports-recreation/keeley-park.aspx", alt: "Child playing in the Keeley Park sprayground" },
    { url: "https://www.visitgreensboronc.com/_images/things-to-do-images/Keeley-Park-Up-in-the-Air.jpg", source: "https://www.visitgreensboronc.com/things-to-do/sports-recreation/keeley-park.aspx", alt: "Up in the Air inclusive playground at Keeley Park" },
    { url: "https://www.visitgreensboronc.com/_images/things-to-do-images/Keeley-Park-Bike-Area.jpg", source: "https://www.visitgreensboronc.com/things-to-do/sports-recreation/keeley-park.aspx", alt: "Riders using the Keeley Park bicycle pump track" }
  ],
  "launch-nc-greenville-south-tar-river-greenway": [
    { url: "https://cloudfront.traillink.com/photos/south-tar-river-greenway_64208_hero.jpg", source: "https://www.traillink.com/trail/south-tar-river-greenway/", author: "sprinkhaan_1 via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Signed Mile 0 bridge on South Tar River Greenway near Town Common" },
    { url: "/assets/parks/nc/greenville/south-tar-river-greenway/off-leash-dog-park.jpg", source: "https://www.visitgreenvillenc.com/things-to-do/outdoors-and-nature/parks-greenways/greenville-greenway-system/", author: "Visit Greenville, NC", license: "Official Visit Greenville, NC tourism image", alt: "Separate fenced play areas at Greenville's Off-Leash Dog Park beside South Tar River Greenway" },
    { url: "/assets/parks/nc/greenville/south-tar-river-greenway/froggs-shade-garden.jpg", source: "https://www.visitgreenvillenc.com/things-to-do/outdoors-and-nature/parks-greenways/greenville-greenway-system/", author: "Visit Greenville, NC", license: "Official Visit Greenville, NC tourism image", alt: "Picnic shelter and native plantings at the FROGGS Community Shade Garden along South Tar River Greenway" }
  ],
  "launch-nc-greenville-greenville-town-common": [
    { url: "https://www.greenvillenc.gov/ImageRepository/Document?documentId=2132", source: "https://www.greenvillenc.gov/m/newsflash/home/detail/34", author: "City of Greenville", license: "Official City of Greenville image", alt: "Fireworks over Greenville Town Common and the Tar River" },
    { url: "/assets/parks/nc/greenville/greenville-town-common/amphitheater-lawn.jpg", source: "https://www.greenvillenc.gov/facilities/facility/details/Town-Common-41", author: "Aaron Hines / City of Greenville", license: "Official City of Greenville image", alt: "Community fitness program on the lawn at Greenville Toyota Amphitheater in Town Common" },
    { url: "/assets/parks/nc/greenville/greenville-town-common/inclusive-playground.jpg", source: "https://www.greenvillenc.gov/facilities/facility/details/Town-Common-41", author: "City of Greenville", license: "Official City of Greenville image", alt: "Inclusive green-and-blue playground framed by spring blossoms at Greenville Town Common" }
  ],
  "launch-nc-greenville-wildwood-park": [
    { url: "https://www.greenvillenc.gov/ImageRepository/Document?documentId=1379", source: "https://www.greenvillenc.gov/495/Wildwood-Park", author: "City of Greenville", license: "Official City of Greenville image", alt: "Aerial view of Wildwood Park playground, welcome center, and lake" },
    { url: "https://www.greenvillenc.gov/ImageRepository/Document?documentID=1381", source: "https://www.greenvillenc.gov/495/Wildwood-Park", author: "City of Greenville", license: "Official City of Greenville image", alt: "Wildwood Park boardwalk bridge across the water" },
    { url: "/assets/parks/nc/greenville/wildwood-park/bicycle-pump-track.jpg", source: "https://www.visitgreenvillenc.com/things-to-do/outdoors-and-nature/parks-greenways/wildwood-park/", author: "Visit Greenville, NC", license: "Official Visit Greenville, NC tourism image", alt: "Mountain biker riding the bicycle skills course and pump track at Wildwood Park" }
  ],
  "launch-nc-high-point-high-point-city-lake-park": [
    { url: "https://www.highpointnc.gov/ImageRepository/Document?documentID=21774", source: "https://www.highpointnc.gov/2704/22146/High-Point-City-Lake-Park-Aquatic-Center", author: "City of High Point", license: "Official City of High Point image", alt: "Shallow splash-pad pool, small slides, spray features, and shade canopies at High Point City Lake Park Aquatic Center" },
    { url: "https://www.highpointnc.gov/ImageRepository/Document?documentID=21790", source: "https://www.highpointnc.gov/2704/22146/High-Point-City-Lake-Park-Aquatic-Center", author: "City of High Point", license: "Official City of High Point image", alt: "Lazy river and children's water-play structure at High Point City Lake Park Aquatic Center" }
  ],
  "launch-nc-high-point-oak-hollow-park": [
    { url: "https://www.highpointnc.gov/ImageRepository/Document?documentID=26926", source: "https://www.highpointnc.gov/2772/Marina", author: "City of High Point", license: "Official City of High Point image", alt: "Accessible purple-and-teal playground overlooking Oak Hollow Lake beside the marina" },
    { url: "https://www.highpointnc.gov/ImageRepository/Document?documentID=21932", source: "https://www.highpointnc.gov/2772/Marina", author: "City of High Point", license: "Official City of High Point image", alt: "Kayak beach and accessible floating dock at Oak Hollow Marina" }
  ],
  "launch-nc-high-point-high-point-greenway": [
    { url: "https://www.highpointnc.gov/ImageRepository/Document?documentID=16685", source: "https://www.highpointnc.gov/1832/Trails-Greenways", author: "City of High Point", license: "Official City of High Point image", alt: "High Point Greenway entrance map beside the paved trail" },
    { url: "https://www.highpointnc.gov/ImageRepository/Document?documentID=6139", source: "https://www.highpointnc.gov/1832/Trails-Greenways", author: "City of High Point", license: "Official City of High Point image", alt: "Shaded paved High Point Greenway crossing a small wooden bridge" }
  ],
  "launch-nc-high-point-piedmont-environmental-center": [
    { url: "https://www.highpointnc.gov/ImageRepository/Document?documentID=16011", source: "https://www.highpointnc.gov/2837/Piedmont-Environmental-Center", author: "City of High Point", license: "Official City of High Point image", alt: "Piedmont Environmental Center visitor building and accessible brick approach" },
    { url: "https://www.highpointnc.gov/ImageRepository/Document?documentID=4856", source: "https://www.highpointnc.gov/2837/Piedmont-Environmental-Center", author: "City of High Point", license: "Official City of High Point image", alt: "Family studying the color-marked natural-trail map at Piedmont Environmental Center" }
  ],
  "launch-nc-high-point-bicentennial-greenway": [
    { url: "https://cloudfront.traillink.com/photos/bicentennial-greenway_160904_hero.jpg", source: "https://www.traillink.com/trail/bicentennial-greenway/", author: "susiepop66 via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Bicentennial Greenway through autumn woods" },
    { url: "https://www.highpointnc.gov/ImageRepository/Document?documentID=14081", source: "https://www.highpointnc.gov/1832/Trails-Greenways", author: "City of High Point", license: "Official City of High Point image", alt: "Curving wooden greenway boardwalk through spring woods near Piedmont Environmental Center" },
    { url: "https://www.highpointnc.gov/ImageRepository/Document?documentID=9856", source: "https://www.highpointnc.gov/1832/Trails-Greenways", author: "City of High Point", license: "Official City of High Point image", alt: "Walkers on the paved wooded greenway near the High Point and Bicentennial connection" }
  ],
  "launch-nc-huntersville-holbrook-park": [
    { url: "https://assets.simpleviewinc.com/simpleview/image/upload/c_limit,h_1200,q_75,w_1200/v1/crm/lakenorman/Holbrook-Park_6c34b400-5056-a36a-0864d8c6e5b877eb.jpg", source: "https://www.visitlakenorman.org/listing/holbrook-park/504/", author: "Visit Lake Norman", license: "Official Visit Lake Norman tourism image", alt: "Shaded playground and courts at Holbrook Park" },
    { url: "/assets/parks/nc/huntersville/holbrook-park/pickleball-courts.jpg", source: "https://www.visitlakenorman.org/blog/stories/post/pickleball-in-lake-norman/", author: "Visit Lake Norman", license: "Official Visit Lake Norman tourism image", alt: "Players using the dedicated pickleball courts at Holbrook Park" },
    { url: "/assets/parks/nc/huntersville/holbrook-park/ascension-sculpture.jpg", source: "https://www.visitlakenorman.org/listing/lake-norman-public-art/2593/", author: "Visit Lake Norman", license: "Official Visit Lake Norman tourism image", alt: "Ascension sculpture along The Vine greenway at Holbrook Park" }
  ],
  "launch-nc-huntersville-latta-nature-preserve": [
    { url: "https://mecknc.widen.net/content/jahx98lhm2/web/mc-img-parks-Quest.JPG?crop=yes&w=1408&h=600&v=e2f23a43-d3ff-4a97-a11b-8ebc6d7405e6&itok=335BkXbA", source: "https://parkandrec.mecknc.gov/Places-to-Visit/Nature/quest-latta-nature-preserve", author: "Mecklenburg County", license: "Official Mecklenburg County image", alt: "Quest Nature Center at Latta Nature Preserve" },
    { url: "/assets/parks/nc/huntersville/latta-nature-preserve/mountain-island-lake.jpg", source: "https://blog.mecknc.gov/latta-nature-preserve/", author: "Mecklenburg County", license: "Official Mecklenburg County image", alt: "Mountain Island Lake viewed through trees at Latta Nature Preserve" },
    { url: "/assets/parks/nc/huntersville/latta-nature-preserve/quest-exhibit-hall.png", source: "https://blog.mecknc.gov/latta-nature-preserve/", author: "Mecklenburg County", license: "Official Mecklenburg County image", alt: "Interactive prairie and freshwater exhibits inside Quest Nature Center" }
  ],
  "launch-nc-huntersville-north-mecklenburg-park": [
    { url: "https://assets.simpleviewinc.com/simpleview/image/upload/c_fill,f_jpg,h_480,q_65,w_640/v1/clients/lakenorman/IMG_2753_93a43730-b203-4754-ac4b-1f30ca8bc128.jpg", source: "https://www.visitlakenorman.org/blog/stories/post/a-guide-to-playgrounds-in-lake-norman/", author: "Visit Lake Norman", license: "Official Visit Lake Norman tourism image", alt: "Playground at North Mecklenburg Park" },
    { url: "/assets/parks/nc/huntersville/north-mecklenburg-park/play-area-and-courts.jpg", source: "https://www.charlottesports.com/field-finder/ball-parks/north-mecklenburg-park", author: "Charlotte Regional Visitors Authority", license: "Official Charlotte Regional Visitors Authority image", alt: "Shaded play area with athletic courts beyond at North Mecklenburg Park" },
    { url: "/assets/parks/nc/huntersville/north-mecklenburg-park/splash-pad.jpg", source: "https://www.visitlakenorman.org/listing/north-mecklenburg-park/330/", author: "Visit Lake Norman", license: "Official Visit Lake Norman tourism image", alt: "Blue-and-green splash pad with tipping bucket and shaded seating at North Mecklenburg Park" }
  ],
  "launch-nc-huntersville-torrence-creek-greenway": [
    { url: "https://mecknc.widen.net/content/xkujsuy70c/web/mc-img-parks-TorrenceCreek?crop=yes&w=444&h=296&v=1325016c-caf7-4b54-a634-df52e8bdfffc&itok=z77rUwzi", source: "https://parkandrec.mecknc.gov/Places-to-Visit/greenways", author: "Mecklenburg County", license: "Official Mecklenburg County image", alt: "Paved Torrence Creek Greenway through a wooded corridor" },
    { url: "/assets/parks/nc/huntersville/torrence-creek-greenway/state-of-flow-tunnel.jpg", source: "https://www.axios.com/local/charlotte/2024/07/15/new-greenway-huntersville", author: "Ashley Mahoney/Axios", license: "Reviewed editorial photo via Axios", alt: "State of Flow illuminated public-art installation inside the Torrence Creek Greenway tunnel" },
    { url: "/assets/parks/nc/huntersville/torrence-creek-greenway/wooded-boardwalk.jpg", source: "https://www.axios.com/local/charlotte/2024/07/15/new-greenway-huntersville", author: "Ashley Mahoney/Axios", license: "Reviewed editorial photo via Axios", alt: "Long accessible boardwalk through dense woods on Torrence Creek Greenway" }
  ],
  "launch-nc-winston-salem-muddy-creek-greenway": [
    { url: "https://cloudfront.traillink.com/photos/muddy-creek-greenway_31271_lg.jpg", source: "https://www.traillink.com/trail-photo/muddy-creek-greenway_31271/", author: "dockaos via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Red bridge at the northern terminus of Muddy Creek Greenway" },
    { url: "https://cloudfront.traillink.com/photos/muddy-creek-greenway_31269_lg.jpg", source: "https://www.traillink.com/trail-photo/muddy-creek-greenway_31269/", author: "dockaos via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Paved Muddy Creek Greenway at the Robinhood Road underpass" },
    { url: "https://cloudfront.traillink.com/photos/muddy-creek-greenway_31266_lg.jpg", source: "https://www.traillink.com/trail-photo/muddy-creek-greenway_31266/", author: "dockaos via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Muddy Creek Greenway trail map sign" }
  ],
  "launch-nc-winston-salem-hanes-park": [
    { url: "https://www.cityofws.org/ImageRepository/Document?documentID=9093", source: "https://www.cityofws.org/facilities/facility/details/Hanes-Park-73", author: "City of Winston-Salem", license: "Official City of Winston-Salem image", alt: "Playground and shaded recreation area at Hanes Park" }
  ],
  "launch-nc-winston-salem-washington-park": [
    { url: "https://www.cityofws.org/ImageRepository/Document?documentID=8859", source: "https://www.cityofws.org/932/Parks", author: "City of Winston-Salem", license: "Official City of Winston-Salem image", alt: "Washington Park's rolling landscape and recreation amenities" },
    { url: "https://admin.onlyinyourstate.com/wp-content/uploads/sites/2/2021/07/a-1.png?allow_lossy=1&w=500", source: "https://www.onlyinyourstate.com/nature/north-carolina/dinosaur-themed-playground-nc", author: "Google contributor S. Gieseking via Only In Your State", license: "Reviewed community image", alt: "Dinosaur sculpture beside the blue-and-yellow playground at Washington Park" },
    { url: "/assets/parks/nc/winston-salem/washington-park/dinosaur-playground.jpg", source: "https://wshome.cityofws.org/Facilities/Facility/Details/Washington-Park-108", author: "City of Winston-Salem", license: "Official City of Winston-Salem image", alt: "Blue dinosaur-themed playground and swings at Washington Park" }
  ],
  "launch-nc-mooresville-cornelius-road-park": [
    { url: "/assets/parks/nc/mooresville/cornelius-road-park/current-campus-aerial.jpg", source: "https://www.mooresvillenc.gov/government/departments/parks___recreation/parks/cornelius_road_park_gallery.php", author: "Town of Mooresville", license: "Official Town of Mooresville image", alt: "Current aerial view of Cornelius Road Park's turf fields, ballfields, courts, paths, and parking" },
    { url: "/assets/parks/nc/mooresville/cornelius-road-park/memorial-dog-park.jpg", source: "https://www.mooresvillenc.gov/government/departments/parks___recreation/parks/cornelius_road_park_gallery.php", author: "Town of Mooresville", license: "Official Town of Mooresville image", alt: "Fenced Officer Jordan H. Sheldon Memorial Dog Park and agility equipment at Cornelius Road Park" }
  ],
  "launch-nc-mooresville-liberty-park": [
    { url: "/assets/parks/nc/mooresville/liberty-park/three-tier-playground.jpg", source: "https://www.mooresvillenc.gov/government/departments/parks___recreation/parks/liberty_park_gallery.php", author: "Town of Mooresville", license: "Official Town of Mooresville image", alt: "Aerial view of Liberty Park's colorful three-tier playground and accessible paths" },
    { url: "/assets/parks/nc/mooresville/liberty-park/splash-pad.jpg", source: "https://www.mooresvillenc.gov/government/departments/parks___recreation/parks/liberty_park_gallery.php", author: "Town of Mooresville", license: "Official Town of Mooresville image", alt: "Children using the interactive splash pad fountains at Liberty Park" }
  ],
  "launch-nc-mooresville-mazeppa-park": [
    { url: "/assets/parks/nc/mooresville/mazeppa-park/youth-lacrosse-fields.jpg", source: "https://www.mooresvillenc.gov/government/departments/parks___recreation/parks/mazeppa_park_gallery.php", author: "Town of Mooresville", license: "Official Town of Mooresville image", alt: "Youth lacrosse teams using a multipurpose field at Mazeppa Park" },
    { url: "/assets/parks/nc/mooresville/mazeppa-park/shaded-playground.jpg", source: "https://www.mooresvillenc.gov/government/departments/parks___recreation/parks/mazeppa_park_gallery.php", author: "Town of Mooresville", license: "Official Town of Mooresville image", alt: "Large shaded playground with slides and climbing equipment at Mazeppa Park" }
  ],
  "launch-nc-wake-forest-e-carroll-joyner-park": [
    { url: "/assets/parks/nc/wake-forest/e-carroll-joyner-park/paved-trail-and-historic-buildings.jpg", source: "https://www.wakeforestnc.gov/parks-recreation-cultural-resources/parks-facilities/e-carroll-joyner-park", author: "Town of Wake Forest", license: "Official Town of Wake Forest image", alt: "Paved walking trail descending toward the restored farm buildings at E. Carroll Joyner Park" },
    { url: "/assets/parks/nc/wake-forest/e-carroll-joyner-park/amphitheater.jpg", source: "https://www.wakeforestnc.gov/parks-recreation-cultural-resources/parks-facilities/e-carroll-joyner-park", author: "Town of Wake Forest", license: "Official Town of Wake Forest image", alt: "Tree-framed amphitheater and accessible paved paths at E. Carroll Joyner Park" }
  ],
  "launch-nc-wake-forest-holding-park": [
    { url: "/assets/parks/nc/wake-forest/holding-park/childrens-water-play.jpg", source: "https://www.wakeforestnc.gov/parks-recreation-cultural-resources/parks-facilities/holding-park-aquatic-center", author: "Town of Wake Forest", license: "Official Town of Wake Forest image", alt: "Families using the shallow children's pool and interactive water features at Holding Park Aquatic Center" },
    { url: "/assets/parks/nc/wake-forest/holding-park/water-slides.jpg", source: "https://www.wakeforestnc.gov/parks-recreation-cultural-resources/parks-facilities/holding-park-aquatic-center", author: "Town of Wake Forest", license: "Official Town of Wake Forest image", alt: "Blue and green water slides at Holding Park Aquatic Center" }
  ],
  "launch-nc-wake-forest-j-b-flaherty-park": [
    { url: "https://www.wakeforestnc.gov/sites/default/files/uploads/parks-facilities/gallery/flahertyparkplayground.jpg", source: "https://www.wakeforestnc.gov/parks-recreation-cultural-resources/parks-facilities/jb-flaherty-park", author: "Town of Wake Forest", license: "Official Town of Wake Forest image", alt: "Children's playground with slides and swings at J.B. Flaherty Park" },
    { url: "/assets/parks/nc/wake-forest/j-b-flaherty-park/outdoor-fitness-court.jpg", source: "https://www.wakeforestnc.gov/parks-recreation-cultural-resources/parks-facilities/jb-flaherty-park", author: "Town of Wake Forest", license: "Official Town of Wake Forest image", alt: "Accessible outdoor fitness court and exercise stations at J.B. Flaherty Park" },
    { url: "/assets/parks/nc/wake-forest/j-b-flaherty-park/pickleball-courts.jpg", source: "https://www.wakeforestnc.gov/parks-recreation-cultural-resources/parks-facilities/jb-flaherty-park", author: "Town of Wake Forest", license: "Official Town of Wake Forest image", alt: "Lighted pickleball courts at J.B. Flaherty Park" }
  ],
  "launch-nc-wilmington-empie-park": [
    { url: "https://www.wilmingtonnc.gov/files/assets/city/v/2/parks-amp-rec/images/athletics/dsc_0099.jpg?w=1200", source: "https://www.wilmingtonnc.gov/Departments-Divisions/Parks-Recreation/Parks-Trails/Empie-Park", author: "City of Wilmington", license: "Official City of Wilmington image", alt: "Tennis player using the Althea Gibson Tennis Complex at Empie Park" },
    { url: "/assets/parks/nc/wilmington/empie-park/wooded-playground.jpg", source: "https://www.wilmingtonandbeaches.com/bike-trails-roundup/", author: "Wilmington and Beaches CVB", license: "Official Wilmington and Beaches tourism image", alt: "Empie Park playground and picnic tables beneath tall pine trees" },
    { url: "/assets/parks/nc/wilmington/empie-park/off-leash-dog-area.jpg", source: "https://www.bringfido.com/attraction/908", author: "Carrie Lee via BringFido", license: "Reviewed community photo via BringFido", alt: "Dogs socializing in the shaded, pine-covered off-leash area at Empie Park" }
  ],
  "launch-nc-wilmington-gary-shell-cross-city-trail": [
    { url: "https://www.wilmingtonnc.gov/files/assets/city/v/1/parks-amp-rec/images/parkstrails/ms1_4426.jpg?w=1200", source: "https://www.wilmingtonnc.gov/Departments-Divisions/Parks-Recreation/Parks-Trails/Gary-Shell-Cross-City-Trail", author: "City of Wilmington", license: "Official City of Wilmington image", alt: "Bicyclist riding the paved Gary Shell Cross-City Trail" },
    { url: "/assets/parks/nc/wilmington/gary-shell-cross-city-trail/community-ride-access.jpg", source: "https://www.wilmingtonandbeaches.com/bike-trails-roundup/", author: "Wilmington and Beaches CVB", license: "Official Wilmington and Beaches tourism image", alt: "Families gathering with bicycles at a Gary Shell Cross-City Trail access point" },
    { url: "/assets/parks/nc/wilmington/gary-shell-cross-city-trail/autumn-wooded-section.jpg", source: "https://www.traillink.com/trail/gary-shell-cross-city-trail/", author: "sherri.hurn via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Cyclist's view along a leaf-covered wooded section of Gary Shell Cross-City Trail near UNCW" }
  ],
  "launch-nc-wilmington-greenfield-park": [
    { url: "/assets/parks/nc/wilmington/greenfield-park/paddle-boat-rental.jpg", source: "https://www.wilmingtonandbeaches.com/listing/greenfield-park/757/", author: "Wilmington and Beaches CVB", license: "Official Wilmington and Beaches tourism image", alt: "Family using a rental paddle boat on Greenfield Lake" }
  ],
  "launch-nc-wake-forest-smith-creek-greenway": [
    { url: "/assets/parks/nc/wake-forest/smith-creek-greenway/paved-greenway.jpg", source: "https://www.wakeforestnc.gov/parks-recreation-cultural-resources/greenways/trails/smith-creek-greenway", author: "Town of Wake Forest", license: "Official Town of Wake Forest image", alt: "Paved Smith Creek Greenway passing through woods beside an outdoor exercise station" },
    { url: "/assets/parks/nc/wake-forest/smith-creek-greenway/trail-map.jpg", source: "https://www.wakeforestnc.gov/parks-recreation-cultural-resources/greenways/trails/smith-creek-greenway", author: "Town of Wake Forest", license: "Official Town of Wake Forest map", alt: "Official Smith Creek Greenway map from Burlington Mills Road to the Neuse River Greenway" }
  ],
  "launch-nc-winston-salem-winston-lake-park": [
    { url: "https://www.cityofws.org/ImageRepository/Document?documentID=10980", source: "https://www.cityofws.org/facilities/facility/details/Winston-Lake-Park-110", author: "City of Winston-Salem", license: "Official City of Winston-Salem image", alt: "Winston Lake Park recreation area beside the lake" },
    { url: "https://www.cityofws.org/ImageRepository/Document?documentID=10981", source: "https://www.cityofws.org/facilities/facility/details/Winston-Lake-Park-110", author: "City of Winston-Salem", license: "Official City of Winston-Salem image", alt: "Family recreation amenities at Winston Lake Park" },
    { url: "/assets/parks/nc/winston-salem/winston-lake-park/spillway-and-lake.jpg", source: "https://wshome.cityofws.org/Facilities/Facility/Details/Winston-Lake-Park-110", author: "City of Winston-Salem", license: "Official City of Winston-Salem image", alt: "Winston Lake spillway and wooded shoreline at Winston Lake Park" }
  ],
  "launch-nc-winston-salem-the-quarry-at-grant-park": [
    { url: "/assets/parks/nc/winston-salem/the-quarry-at-grant-park/quarry-overview.jpg", source: "https://www.visitwinstonsalem.com/quarry-grant-park-trails", author: "Visit Winston-Salem", license: "Official Winston-Salem tourism image", alt: "Sunset over the quarry lake and The Boom observation pier at The Quarry at Grant Park" },
    { url: "/assets/parks/nc/winston-salem/the-quarry-at-grant-park/boom-sunset.jpg", source: "https://www.visitwinstonsalem.com/quarry-grant-park-trails", author: "Jason Tarr via Visit Winston-Salem", license: "Official Winston-Salem tourism image", alt: "Visitors standing on The Boom observation pier at sunset at The Quarry at Grant Park" },
    { url: "/assets/parks/nc/winston-salem/the-quarry-at-grant-park/playground-tower.jpg", source: "https://kidfriendlytriad.com/directories/quarry-park-playground/", author: "Kid Friendly Triad", license: "Reviewed local family-guide image", alt: "Children climbing the 42-foot quarry-themed playground tower at The Quarry at Grant Park" }
  ],
  "launch-nc-winston-salem-salem-lake-park": [
    { url: "https://www.cityofws.org/ImageRepository/Document?documentId=7598", source: "https://www.cityofws.org/2144/Salem-Lake-Marina-Center", author: "City of Winston-Salem", license: "Official City of Winston-Salem image", alt: "Salem Lake Marina Center and wraparound waterfront deck" },
    { url: "https://www.cityofws.org/ImageRepository/Document?documentId=7597", source: "https://www.cityofws.org/2144/Salem-Lake-Marina-Center", author: "City of Winston-Salem", license: "Official City of Winston-Salem image", alt: "Event space with panoramic views inside the Salem Lake Marina Center" }
  ],
  "launch-nc-winston-salem-salem-creek-greenway": [
    { url: "https://cloudfront.traillink.com/photos/salem-creek-greenway_224549_lg.jpg", source: "https://www.traillink.com/trail-photo/salem-creek-greenway_224549/", author: "ups88rulz via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Salem Lake view from the eastern end of Salem Creek Greenway" },
    { url: "https://cloudfront.traillink.com/photos/salem-creek-greenway_53193_lg.jpg", source: "https://www.traillink.com/trail-photo/salem-creek-greenway_53193/", author: "sammybike via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Salem Creek Greenway bridge crossing near South Main Street" },
    { url: "https://cloudfront.traillink.com/photos/salem-creek-greenway_41101_lg.jpg", source: "https://www.traillink.com/trail-photo/salem-creek-greenway_41101/", author: "sprinkhaan_1 via TrailLink", license: "Reviewed community photo via TrailLink", alt: "Wooden Salem Creek Greenway bridge near the Gateway YWCA" }
  ],
  "launch-nc-cary-marla-dorrel-park": [
    { url: "https://www.kidstogethercary.org/uploads/1/5/3/7/153746120/dsc-9090-scaled-orig_orig.jpg", source: "https://www.kidstogethercary.org/playground-features.html", alt: "Inclusive preschool play area at Kids Together Playground in Marla Dorrel Park" },
    { url: "https://www.kidstogethercary.org/uploads/1/5/3/7/153746120/dsc-9105-scaled-orig_orig.jpg", source: "https://www.kidstogethercary.org/playground-features.html", alt: "KATAL dragon climbing sculpture at Kids Together Playground in Marla Dorrel Park" },
    { url: "https://www.kidstogethercary.org/uploads/1/5/3/7/153746120/cr-0048850-1689179616-shelter2-orig_orig.jpg", source: "https://www.kidstogethercary.org/playground-features.html", alt: "Picnic shelter beside Kids Together Playground in Marla Dorrel Park" }
  ],
  "launch-nc-clemmons-tanglewood-park": [
    { url: "https://forsyth.cc/parks/tanglewood/assets/img/gardens.jpg", source: "https://forsyth.cc/parks/Tanglewood/gardens.aspx", alt: "Gardens at Tanglewood Park" },
    { url: "https://forsyth.cc/parks/assets/img/dogparks/IMG_0142.JPG", source: "https://forsyth.cc/parks/dog_park.aspx", alt: "Tanglewoof Dog Park at Tanglewood Park" },
    { url: "https://forsyth.cc/parks/tanglewood/assets/img/tennis_center.jpg", source: "https://forsyth.cc/parks/Tanglewood/tennis.aspx", alt: "Tennis Center at Tanglewood Park" }
  ],
  "launch-nc-concord-les-myers-park": [
    { url: "https://concordnc.gov/LinkClick.aspx?fileticket=-GSZvDbPCJ4%3d&portalid=0", source: "https://concordnc.gov/Departments/Parks-Recreation/Parks", alt: "Park shelter at Les Myers Park" },
    { url: "https://concordnc.gov/LinkClick.aspx?fileticket=wVUoI_3dX2c%3d&portalid=0", source: "https://concordnc.gov/Departments/Parks-Recreation/Parks", alt: "Paul's Kitchen shelter at Les Myers Park" },
    { url: "https://concordnc.gov/LinkClick.aspx?fileticket=5bpyRS2reD0%3d&portalid=0", source: "https://concordnc.gov/Departments/Parks-Recreation/Parks", alt: "Frank Dusch Amphitheater at Les Myers Park" }
  ],
  "launch-nc-concord-brown-mill-mountain-bike-trail-park": [
    { url: "/assets/parks/nc/concord/brown-mill-mountain-bike-trail-park/trailhead-map.jpg", source: "https://www.explorecabarrus.com/businesses/brown-mill-mountain-bike-trail/", author: "Explore Cabarrus", license: "Official Cabarrus County tourism image", alt: "Family reviewing the trail map with mountain bikes at the Brown Mill trailhead" },
    { url: "/assets/parks/nc/concord/brown-mill-mountain-bike-trail-park/rider-on-singletrack.jpg", source: "https://www.explorecabarrus.com/businesses/brown-mill-mountain-bike-trail/", author: "Explore Cabarrus", license: "Official Cabarrus County tourism image", alt: "Mountain biker riding Brown Mill's wooded singletrack and berms" }
  ],
  "launch-nc-concord-lake-fisher": [
    { url: "https://concordnc.gov/LinkClick.aspx?fileticket=51siY7_sMP8%3d&portalid=0", source: "https://concordnc.gov/Departments/Parks-Recreation/Lake-Fisher", author: "City of Concord", license: "Official City of Concord image", alt: "Families fishing from the shoreline during the Lake Fisher Fishing Derby" },
    { url: "/assets/parks/nc/concord/lake-fisher/boat-ramp.jpg", source: "https://concordnc.gov/Services/Community/News/ID/80/Work-to-Restore-Clarity-of-City%E2%80%99s-Water-Supply-Continues", author: "City of Concord", license: "Official City of Concord image", alt: "Lake Fisher boat ramp, rental boats, shoreline, and water-control structure" },
    { url: "/assets/parks/nc/concord/lake-fisher/intake-structure.jpg", source: "https://concordnc.gov/Services/Community/News/ID/80/Work-to-Restore-Clarity-of-City%E2%80%99s-Water-Supply-Continues", author: "City of Concord", license: "Official City of Concord image", alt: "Lake Fisher water-control structure viewed from the shoreline" }
  ],
  "launch-nc-concord-mceachern-greenway": [
    { url: "/assets/parks/nc/concord/harold-b-mceachern-greenway/downtown-connector.jpg", source: "https://concordnc.gov/Departments/Parks-Recreation/Greenways", author: "City of Concord", license: "Official City of Concord image", alt: "Paved downtown connector on the Harold B. McEachern Greenway with a stretching station" },
    { url: "/assets/parks/nc/concord/harold-b-mceachern-greenway/wooded-boardwalk.jpg", source: "https://www.carolinathreadtrailmap.org/trails/trail/harold-b-mceachern-greenway", author: "David Morway via Carolina Thread Trail", license: "Official Carolina Thread Trail image", alt: "Wooden boardwalk carrying the Harold B. McEachern Greenway through shaded woods" }
  ],
  "launch-nc-concord-weddington-road-bark-park": [
    { url: "/assets/parks/nc/concord/weddington-road-bark-park/dogs-in-fenced-area.jpg", source: "https://www.barkparkfinder.com/dog-parks-near-me/concord-north-carolina-weddington-road-bark-park/", author: "Bark Park Finder contributor", license: "Reviewed community photo via Bark Park Finder", alt: "Dogs socializing inside the fenced play area at Weddington Road Bark Park" },
    { url: "/assets/parks/nc/concord/weddington-road-bark-park/entrance-and-rules.jpg", source: "https://www.barkparkfinder.com/dog-parks-near-me/concord-north-carolina-weddington-road-bark-park/", author: "Bark Park Finder contributor", license: "Reviewed community photo via Bark Park Finder", alt: "Gated entrance and posted rules at Weddington Road Bark Park" },
    { url: "https://img.barkparkfinder.com/2025/08/concord-north-carolina-weddington-road-bark-park-6-800x450.jpg", source: "https://www.barkparkfinder.com/dog-parks-near-me/concord-north-carolina-weddington-road-bark-park/", author: "Bark Park Finder contributor", license: "Reviewed community photo via Bark Park Finder", alt: "Dog using the fenced, wooded play area at Weddington Road Bark Park" }
  ],
  "launch-nc-chapel-hill-bolin-creek-trail": [
    { url: "https://www.chapelhillnc.gov/files/assets/town/v/1/public-works/images/bridge-over-creek.jpg?dimension=pageimagefullwidth&w=1140", source: "https://www.chapelhillnc.gov/Town-Government/Departments-and-Offices/Public-Works/Engineering", alt: "Paved Bolin Creek Trail crossing a metal bridge over the creek" },
    { url: "/assets/parks/nc/chapel-hill/bolin-creek-umstead-connection.jpg", source: "https://triangleblogblog.com/2023/04/21/chapel-hills-actions-to-extend-the-bolin-creek-greenway-increase-the-urgency-of-carrboros-proposed-extension/", author: "Ryan Byars via Triangle Blog Blog", license: "Reviewed local community photo", alt: "Walkers crossing Bolin Creek Trail near the Umstead Park connection" }
  ],
  "launch-nc-chapel-hill-cedar-falls-park": [
    { url: "https://www.chapelhillnc.gov/files/assets/town/v/2/pampr/images/facilities-and-pools/athletic-fields/cedar-falls-park.jpg", source: "https://www.chapelhillnc.gov/Events-and-Activities/Recreation/Recreation-Facilities/Athletic-Fields", alt: "Turf and baseball fields at Cedar Falls Park" },
    { url: "https://www.chapelhillnc.gov/files/assets/town/v/1/pampr/images/facilities-and-pools/picnic-shelters/picnicshelter_cedarfalls.jpg", source: "https://www.chapelhillnc.gov/Events-and-Activities/Recreation/Recreation-Facilities/Picnic-Shelters", alt: "Wooded picnic shelter at Cedar Falls Park" }
  ],
  "launch-nc-chapel-hill-homestead-park": [
    { url: "https://www.chapelhillnc.gov/files/assets/town/v/1/pampr/images/hp_turffields-300.jpg", source: "https://www.chapelhillnc.gov/Events-and-Activities/Recreation/Recreation-Facilities/Athletic-Fields", alt: "Youth soccer on the artificial turf fields at Homestead Park" },
    { url: "https://www.chapelhillnc.gov/files/assets/town/v/2/pampr/images/facilities-and-pools/homestead-aquatic-center.jpg", source: "https://www.chapelhillnc.gov/Events-and-Activities/Recreation/Pools", alt: "Indoor lap and recreation pools at Homestead Aquatic Center" }
  ],
  "launch-nc-chapel-hill-southern-community-park": [
    { url: "https://www.chapelhillnc.gov/files/assets/town/v/2/pampr/images/facilities-and-pools/athletic-fields/scp_multiusenaturalfileds-300.jpg", source: "https://www.chapelhillnc.gov/Events-and-Activities/Recreation/Recreation-Facilities/Athletic-Fields", alt: "Youth soccer on the natural-grass fields at Southern Community Park" },
    { url: "https://www.chapelhillnc.gov/files/assets/town/v/1/pampr/images/facilities-and-pools/picnic-shelters/picnicshelter_scp_small.jpg", source: "https://www.chapelhillnc.gov/Events-and-Activities/Recreation/Recreation-Facilities/Picnic-Shelters", alt: "Reservable picnic shelter at Southern Community Park" }
  ],
  "launch-nc-jacksonville-jacksonville-commons-recreation-complex": [
    { url: "https://www.jacksonvillenc.gov/ImageRepository/Document?documentID=4205", source: "https://www.jacksonvillenc.gov/index.aspx?NID=781", alt: "Cyclists entering the wooded Commons Challenge Course" },
    { url: "https://www.jacksonvillenc.gov/ImageRepository/Document?documentID=4207", source: "https://www.jacksonvillenc.gov/index.aspx?NID=781", alt: "Athletic field at Jacksonville Commons Recreation Complex" }
  ],
  "launch-nc-jacksonville-riverwalk-crossing-park": [
    { url: "https://jacksonvillenc.gov/PhotoGallery/3/2014-06-riverwalk_2.JPG", source: "https://jacksonvillenc.gov/gallery.aspx?PID=65", alt: "Brick walkways, benches, and flowering gardens at Riverwalk Crossing Park" },
    { url: "https://www.jacksonvillenc.gov/ImageRepository/Document?documentID=4177", source: "https://jacksonvillenc.gov/772/Riverwalk-Crossing-Downtown-Parks", alt: "Shaded benches and brick paths in the downtown waterfront gardens" },
    { url: "https://jacksonvillenc.gov/ImageRepository/Path?filePath=%2fdocuments%2f00000000-0000-0000-0000-000000000000%2f38%2f41%2fRiverwalk-Crossing-Park_201305081025178412.jpg", source: "https://jacksonvillenc.gov/facilities/facility/details/Riverwalk-Park-19", alt: "Riverwalk Crossing Park stage, lawn, and waterfront event space" }
  ],
  "launch-nc-jacksonville-wilson-bay-park": [
    { url: "https://www.jacksonvillenc.gov/PhotoGallery/3/wilsonbay_7.JPG", source: "https://www.jacksonvillenc.gov/Gallery.aspx?PID=71", alt: "Accessible pier and covered overlook extending into Wilson Bay" },
    { url: "https://www.jacksonvillenc.gov/PhotoGallery/3/DSC_0212.JPG", source: "https://www.jacksonvillenc.gov/Gallery.aspx?PID=91", author: "Rodney Koonce via City of Jacksonville", alt: "Wilson Bay boardwalk and shoreline at sunset" },
    { url: "https://jacksonvillenc.gov/ImageRepository/Path?filePath=%2fdocuments%2f00000000-0000-0000-0000-000000000000%2f38%2f41%2fWilson-Bay-Shelter_201305081025178412.jpg", source: "https://jacksonvillenc.gov/facilities/facility/details/Wilson-Bay-Park-22", alt: "Picnic shelter and lawn at Wilson Bay Park" }
  ],
  "launch-nc-jacksonville-northeast-creek-park": [
    { url: "https://www.jacksonvillenc.gov/ImageRepository/Document?documentID=6544", source: "https://www.jacksonvillenc.gov/779/Northeast-Creek-Park", alt: "Inclusive playground at Northeast Creek Park" },
    { url: "https://www.jacksonvillenc.gov/ImageRepository/Document?documentID=6251", source: "https://www.jacksonvillenc.gov/779/Northeast-Creek-Park", alt: "Boat ramp and water access at Northeast Creek Park" },
    { url: "https://www.jacksonvillenc.gov/ImageRepository/Document?documentID=5090", source: "https://www.jacksonvillenc.gov/779/Northeast-Creek-Park", alt: "Children using the seasonal splash pad at Northeast Creek Park" }
  ],
  "launch-nc-jacksonville-sturgeon-city-park": [
    { url: "https://www.jacksonvillenc.gov/ImageRepository/Document?documentID=7376", source: "https://www.jacksonvillenc.gov/203/Parks", alt: "Boardwalk and waterfront at Sturgeon City Park" },
    { url: "https://www.jacksonvillenc.gov/ImageRepository/Document?documentID=10292", source: "https://www.jacksonvillenc.gov/971/Partner-Projects-Initatives", alt: "Aerial view of Sturgeon City Park, wetlands, boardwalks, and Wilson Bay" },
    { url: "/assets/parks/nc/jacksonville/sturgeon-city-environmental-education-center.jpg", source: "https://sturgeoncity.org/about-us/", alt: "Sturgeon City Environmental Education Center beside the public park" }
  ]
};

let updated = 0;
for (const record of records.values()) {
  record.images = (record.images || []).filter((image) => image.matchMethod !== "reviewed-official-gallery");
}
for (const [id, indexes] of Object.entries(selections)) {
  const record = records.get(id);
  const source = campaign[id];
  const available = candidates.get(id) || [];
  if (!record || !source) continue;
  const reviewed = indexes.map((index) => available[index]).filter(Boolean).map((image) => ({
    url: image.url,
    source: source.source,
    author: source.sourceLabel,
    license: `Official ${source.sourceLabel} image`,
    alt: image.alt || `${record.park || source.name || id.split("-").slice(4).join(" ")} visitor photo`,
    matchMethod: "reviewed-official-gallery"
  }));
  if (!reviewed.length) continue;
  record.images = [...reviewed, ...(record.images || [])].filter((image, index, images) => image?.url && images.findIndex((candidate) => candidate.url === image.url) === index).slice(0, 3);
  record.reviewStatus = "reviewed-official-gallery";
  updated += 1;
}
for (const [id, images] of Object.entries(directSelections)) {
  const record = records.get(id);
  const source = campaign[id];
  if (!record) continue;
  const reviewed = images.map((image) => ({
    ...image,
    author: image.author || source?.sourceLabel || "Source publisher",
    license: image.license || `Official ${source?.sourceLabel || "publisher"} image`,
    matchMethod: "reviewed-official-gallery"
  }));
  record.images = [...reviewed, ...(record.images || [])].filter((image, index, allImages) => image?.url && allImages.findIndex((candidate) => candidate.url === image.url) === index).slice(0, 3);
  record.reviewStatus = "reviewed-official-gallery";
  updated += 1;
}

fs.writeFileSync(enrichmentPath, `${JSON.stringify({ ...enrichment, generatedAt: new Date().toISOString(), parks: [...records.values()] }, null, 2)}\n`);
console.log(JSON.stringify({ updated, selectedImages: Object.values(selections).reduce((total, indexes) => total + indexes.length, 0) + Object.values(directSelections).reduce((total, images) => total + images.length, 0) }, null, 2));
