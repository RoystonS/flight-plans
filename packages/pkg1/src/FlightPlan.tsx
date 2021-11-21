import { roundNumber } from "./utils";

export interface IFlightPlan {
  waypoints: IWaypoint[];
}

export type WaypointType = "airport" | "intersection" | "ndb" | "user";

const WaypointTypeMappings: Record<string, WaypointType> = {
  Airport: "airport",
  Intersection: "intersection",
  NDB: "ndb",
  User: "user",
};

export interface IWaypoint {
  id: string;
  type: WaypointType;
  position: ILatLong;
  rawPosition: string; // N66° 34' 20.71",W145° 14' 46.82",+000447.00
  icao?: string;
}

export interface ILatLong {
  lat: number;
  lng: number;
}

export function parseFlightPlan(content: string): IFlightPlan {
  const parser = new DOMParser();
  content = handleUTF8(content);
  const doc = parser.parseFromString(content, "text/xml");
  const rawWaypoints = doc.querySelectorAll("ATCWaypoint");
  const outputWaypoints: IWaypoint[] = [];

  for (const rawWaypoint of rawWaypoints) {
    const rawPosition =
      rawWaypoint.querySelector("WorldPosition")!.textContent!;

    const waypointType =
      WaypointTypeMappings[
        rawWaypoint.querySelector("ATCWaypointType")!.textContent || ""
      ];
    if (!waypointType) {
      throw new Error(
        `Unknown waypoint type: ${
          rawWaypoint.querySelector("ATCWaypointType")!.textContent
        }`
      );
    }

    outputWaypoints.push({
      id: rawWaypoint.getAttribute("id")!,
      type: waypointType,
      rawPosition,
      position: parseLatLongDMS(rawPosition),
      icao: rawWaypoint.querySelector("ICAO ICAOIdent")?.textContent!,
    });
  }

  console.log("waypoints", outputWaypoints);
  return {
    waypoints: outputWaypoints,
  };
}

// Input: N66° 34' 20.71",W145° 14' 46.82"
// Output: ILatLong
function parseLatLongDMS(text: string): ILatLong {
  const match = text.match(
    /([NS])(\d+)\u00B0\s+(\d+)'\s+(\d+\.\d+)",([EW])(\d+)\u00B0\s+(\d+)'\s+(\d+\.\d+)"/
  );
  if (match) {
    const [, ns, nsD, nsM, nsS, ew, ewD, ewM, ewS] = match;
    let rawLat =
      parseFloat(nsD) + parseFloat(nsM) / 60 + parseFloat(nsS) / 3600;
    let rawLong =
      parseFloat(ewD) + parseFloat(ewM) / 60 + parseFloat(ewS) / 3600;

    rawLat = roundNumber(rawLat, 5);
    rawLong = roundNumber(rawLong, 5);

    return {
      lat: ns === "N" ? rawLat : -rawLat,
      lng: ew === "E" ? rawLong : -rawLong,
    };
  } else {
    debugger;
    throw new Error("TODO");
  }
}

function handleUTF8(text: string) {
  return text.replaceAll(/&#x([0-9A-Fa-f][0-9A-Fa-f])/g, (sub, ...rest) => {
    console.log("sub", sub);
    return String.fromCharCode(parseInt(rest[0], 16));
  });
}
