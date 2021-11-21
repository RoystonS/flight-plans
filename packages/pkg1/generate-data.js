// @ts-check
const fs = require("fs");
const path = require("path");
const sqlite3 = require("better-sqlite3");

/**@typedef Airport
 * @property {string} n - Name
 * @property {string} [c] - City (if different from Name)
 * @property {number} e - Elevation
 * @property {number} mv - Magnetic variation
 * @property {Frequency[]} [freqs] - Frequencies
 * @property {Runway[]} [runways] - Runways
 */

/**
 * @typedef Frequency
 * @property {string} t - Type
 * @property {number} f - Frequnecy in MHz
 * @property {string} n - Name
 */

/**
 * @typedef Runway
 * @property {string} s - Surface Type
 * @property {number} l - Length/feet
 * @property {number} w - Width/feet
 * @property {number} [e] - Elevation (if different from airport)
 * @property {RunwayEnd} e1
 * @property {RunwayEnd} e2
 */

/**
 * @typedef RunwayEnd
 * @property {string} n - Name
 * @property {number} h - Magnetic heading
 * @property {boolean} [c] - Closed
 * @property {string} [p] - Pattern (if not 'L')
 * @property {number} [o] - Offset threshold
 */

const dbFilename = path.join(
  process.env.APPDATA,
  "ABarthel",
  "little_navmap_db",
  "little_navmap_msfs.sqlite"
);
const db = sqlite3(dbFilename, {
  readonly: true,
  fileMustExist: true,
  verbose(...args) {
    console.log(...args);
  },
});

const commsTypes = {
  A: "Approach Control",
  ASOS: "ASOS",
  ATIS: "ATIS",
  AWOS: "AWOS",
  C: "Clearance Delivery",
  CPT: "Clearance Pre-Taxi",
  CTAF: "CTAF",
  CTR: "Area Control Centre",
  D: "Departure Control",
  FSS: "Flight Service Station",
  G: "Ground Control",
  MC: "Multicom",
  RCD: "Remote Clearance Delivery",
  T: "Tower (ATC)",
  UC: "UNICOM",
};

const surfaceTypes = {
  A: "Asphalt",
  B: "Bituminous",
  C: "Concrete",
  CE: "Cement",
  CR: "Coral",
  D: "Dirt",
  G: "Grass",
  GR: "Gravel",
  M: "Macadam",
  OT: "Oil Treated",
  S: "Sand",
  SN: "Snow",
  T: "Tarmac",
  W: "Water",
  UNKNOWN: "Unknown",
};

/** @type {Record<string, Airport>} */
const airports = {};

/**
 * @param {number} num
 * @param {number} digits
 * @returns
 */
function round(num, digits) {
  return parseFloat(num.toFixed(digits));
}

/**
 * @param {string} ident
 * @param {boolean} create - Create if does not already exist
 * @returns {Airport}
 */
function getAirport(ident, create) {
  let airport = airports[ident];
  if (!airport && create) {
    airport = { e: NaN, n: "", mv: NaN };
    airports[ident] = airport;
  }
  return airport;
}

function getAirports() {
  const stmt = db.prepare(`
SELECT a.ident, a.name, a.city, a.region, a.altitude, a.mag_var
FROM airport AS a
WHERE a.scenery_local_path LIKE '%fs-base%'
`);

  for (const row of stmt.iterate()) {
    const airport = getAirport(row.ident, true);
    airport.n = row.name;
    if (row.city !== row.name) {
      airport.c = row.city;
    }
    airport.e = row.altitude;
    airport.mv = round(row.mag_var, 2);
  }
}

function getComms() {
  const stmt = db.prepare(`
SELECT a.ident, c.type, c.frequency, c.name
FROM airport AS a
JOIN com AS c
ON c.airport_id = a.airport_id`);
  for (const row of stmt.iterate()) {
    const airport = getAirport(row.ident, false);
    if (!airport) {
      continue;
    }

    airport.freqs = airport.freqs || [];
    airport.freqs.push({
      t: row.type,
      f: row.frequency / 1000000,
      n: row.name,
    });

    if (!commsTypes[row.type]) {
      throw new Error(
        `Unknown comms type ${row.type} for airport ${row.ident}`
      );
    }
  }
}

function getRunways() {
  const stmt = db.prepare(`
  SELECT a.ident, r.surface, r.length, r.width, r.altitude,

  e1.name AS e1Name, e1.end_type AS e1Type, e1.offset_threshold AS e1OffsetThreshold,
  e1.ils_ident as e1ILS, e1.heading AS e1Heading,
  e1.altitude AS e1Alt, e1.has_closed_markings AS e1Closed, e1.is_pattern AS e1Pattern,

  e2.name AS e2Name, e2.end_type AS e2Type, e2.offset_threshold AS e2OffsetThreshold,
  e2.ils_ident as e2ILS, e2.heading AS e2Heading,
  e2.altitude AS e2Alt, e2.has_closed_markings AS e2Closed, e2.is_pattern AS e2Pattern

  FROM airport AS a
  JOIN runway AS r
  ON r.airport_id = a.airport_id

  JOIN runway_end AS e1
  ON r.primary_end_id = e1.runway_end_id

  JOIN runway_end AS e2
  ON r.secondary_end_id = e2.runway_end_id
`);

  let c = 0;
  for (const row of stmt.iterate()) {
    c++;

    if (!surfaceTypes[row.surface]) {
      throw new Error(
        `Unknown surface type ${row.surface} for airport ${row.ident}`
      );
    }

    const airport = getAirport(row.ident, false);
    if (!airport) {
      continue;
    }

    airport.runways = airport.runways || [];

    const magvar = airport.mv;

    /** @type {Runway} */
    const runway = {
      s: row.surface,
      l: row.length,
      w: row.width,
      e1: {
        n: row.e1Name,
        h: fixHeading(row.e1Heading - magvar),
      },
      e2: {
        n: row.e2Name,
        h: fixHeading(row.e2Heading - magvar),
      },
    };
    if (row.e1Closed) {
      runway.e1.c = true;
    }
    if (row.e1Pattern !== "L") {
      runway.e1.p = row.e1Pattern;
    }
    if (row.e1OffsetThreshold) {
      runway.e1.o = row.e1OffsetThreshold;
    }
    if (row.e2Closed) {
      runway.e2.c = true;
    }
    if (row.e2Pattern !== "L") {
      runway.e2.p = row.e2Pattern;
    }
    if (row.e2OffsetThreshold) {
      runway.e2.o = row.e2OffsetThreshold;
    }
    if (row.altitude !== airport.e) {
      runway.e = row.altitude;
    }
    airport.runways.push(runway);
  }
}

function fixHeading(heading) {
  return round((360 + heading) % 360, 0);
}

getAirports();
getComms();
getRunways();

/*
console.log("airports", Object.keys(airports).length);
console.log(getAirport("EGSC"));
console.log(getAirport("NZMO"));
*/
console.log(JSON.stringify(getAirport("LGTE"), null, 2));

// Break up by prefixes

function getPrefix(ident) {
  return ident.substr(0, 2);
}

/** @type {Record<string, Record<string, Airport>>} */
const allPrefixed = {};
for (const [ident, airport] of Object.entries(airports)) {
  const prefix = getPrefix(ident);
  let prefixed = allPrefixed[prefix];
  if (!prefixed) {
    prefixed = {};
    allPrefixed[prefix] = prefixed;
  }
  prefixed[ident] = airport;
}

const outDir = path.join("static", "data");
fs.mkdirSync(outDir, { recursive: true });
for (const [prefix, prefixed] of Object.entries(allPrefixed)) {
  const fn = path.join(outDir, `airports-${prefix}.json`);
  fs.writeFileSync(fn, JSON.stringify(prefixed, null, 2), "utf8");
}
