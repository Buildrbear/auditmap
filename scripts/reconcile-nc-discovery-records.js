const fs = require("fs");
const path = require("path");

const inventoryPath = path.join(__dirname, "..", "data", "nc-white-dot-inventory.json");

const deferred = {
  "5401 North Dog Park": "Private residential development amenity; not a general public dog park.",
  "Chavis Park": "Duplicate of the curated John Chavis Memorial Park listing.",
  "Dog Park at Dix Park": "Duplicate of the curated Dix Park Dog Park listing.",
  "Dorothea Dix Park": "Former-name duplicate of the curated Dix Park listing.",
  "Inside Wade North Pocket Park": "Residential development pocket park; defer until public access is established.",
  "Inside Wade South Pocket Park": "Residential development pocket park; defer until public access is established.",
  "Inside Wade Van Page Park": "Residential development pocket park; defer until public access is established.",
  "The Providence Dog Park": "Private residential community amenity; not a general public dog park.",
  "Crabtree Valley Trail": "Duplicate fragment of the curated Crabtree Creek Greenway Trail listing.",
  "Glen Eden Tennis Park": "Amenity fragment of the promoted Glen Eden Pilot Park listing.",
  "Pop-Pup Dog Park": "Expired temporary pop-up installation; not a current permanent dog park.",
  "Renaissance Park": "Private HOA recreation amenity; not a City of Raleigh public park.",
  "North Bend Dog Park": "Private North Bend townhouse-community amenity; not a City of Raleigh public dog park.",
  "Sunny Brook Estates Park": "Residential development amenity; public access is not established.",
  "Wade Park": "Private owners-association common area; not a City of Raleigh public park.",
  "Walnut Creek Park South": "Municipal open-space tract rather than a maintained standalone visitor destination; use the curated Walnut Creek Greenway Trail or Walnut Creek Athletic Complex listings.",
  "Arts Quad": "UNC Charlotte campus quad; not a municipal or county public park destination.",
  "East Main Quad": "UNC Charlotte campus quad; not a municipal or county public park destination.",
  "Heather Ridge Dog Park": "Apartment-complex dog amenity; not a general public dog park.",
  "Christenbury Park": "Private Highland Creek community-association park; not a general public park.",
  "Back Creek Park": "Mecklenburg County Park Explorer classifies this land holding as undeveloped and non-operational.",
  "Hidden Valley Park": "Mecklenburg County Park Explorer classifies this land holding as undeveloped and non-operational.",
  "Riverside Drive Park": "Mecklenburg County Park Explorer classifies this land holding as undeveloped and non-operational.",
  "Reddman Park": "Duplicate name for Reddman Road Park, which Mecklenburg County classifies as undeveloped and non-operational.",
  "Northwoods Community Park": "Northwoods HOA neighborhood recreation amenity; not listed in Mecklenburg County Park Explorer as a general public park.",
  "Pet Station Dog Park": "Private Park South Station HOA dog amenity within a gated residential community.",
  "Prosperity Park": "Private residential-community park; the source record explicitly marks access as private.",
  "Jordon H Shelton Memorial Dog Park (Small Dog)": "Amenity fragment of the same Jordan H. Shelton Memorial Dog Park represented by the large-dog enclosure record; keep one visitor destination rather than separate pages for each enclosure.",
  "Colliers Lake Park": "Legacy GNIS point not included in the City of Statesville's current parks directory; defer until current public access and visitor facilities are established.",
  "I-40 Park": "Legacy GNIS point not included in the City of Statesville's current parks directory; defer until current public access and visitor facilities are established.",
  "Iredell waterways park": "Contributor-named open-space parcel not included in the City of Statesville's current parks directory; current visitor access and facilities are not established.",
  "Statesville historical building park": "Contributor-named municipal parcel rather than a documented City of Statesville park destination.",
  "Statesville Power Park": "Contributor-named utility parcel rather than a documented City of Statesville park destination.",
  "Randolph Memorial Park": "Cemetery and memorial-garden property rather than a public recreation park destination.",
  "Loflin Park": "Contributor-named parcel not included in the City of Asheboro's current public-parks directory; defer until public access and visitor facilities are established.",
  "Muni Park": "Contributor-named parcel not included in the City of Asheboro's current public-parks directory; defer until public access and visitor facilities are established.",
  "Adams Farm Park": "Adams Farm Community Association recreation amenity rather than a City of Greensboro public park; defer until general public access is established.",
  "Tannenbaum Historic Park": "Former name for the federally managed Hoskins Farm Site within Guilford Courthouse National Military Park; use the curated national military park listing rather than a duplicate destination.",
  "Emerald Park": "Mapped within the Davenport Farms at Emerald Park subdivision but absent from Greenville's current public-parks directory; defer until general public access is established.",
  "Little Dog Park": "Amenity fragment of Greenville's single Off-Leash Dog Area at 1703 River Drive; do not create a separate destination page for one enclosure.",
  "Azalea Small Breed Dog Park": "Amenity fragment of Azalea Dog Park; keep one visitor destination with both the small- and large-dog enclosures documented together.",
  "Ballantree neighborhood park": "Residential-neighborhood open space rather than a documented City of Asheville public park destination; defer until general public access is established.",
};

const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
let changed = 0;
const places = inventory.places.map((place) => {
  const reason = ["Raleigh", "Charlotte", "Statesville", "Asheboro", "Greensboro", "Greenville", "Asheville"].includes(place.city) ? deferred[place.name] : null;
  if (!reason || place.inventoryStatus === "deferred-non-park") return place;
  changed += 1;
  return {
    ...place,
    inventoryStatus: "deferred-non-park",
    discoveryStatus: "hidden-low-priority",
    deferredReason: reason,
    hiddenFromMap: true,
  };
});

fs.writeFileSync(inventoryPath, `${JSON.stringify({
  ...inventory,
  reconciledAt: new Date().toISOString(),
  places,
}, null, 2)}\n`);
console.log(JSON.stringify({ changed, deferred: Object.keys(deferred).length }, null, 2));
