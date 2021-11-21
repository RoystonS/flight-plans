export interface IFlightPlan {
  waypoints: IWaypoint[];
}

export enum WaypointType {
  Airport,
  User,
}

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

/*
        <ATCWaypoint id="PFYU">
            <ATCWaypointType>Airport</ATCWaypointType>
            <WorldPosition>N66° 34' 20.71",W145° 14' 46.82",+000447.00</WorldPosition>
            <ICAO>
                <ICAOIdent>PFYU</ICAOIdent>
            </ICAO>
        </ATCWaypoint>
        <ATCWaypoint id="WP1">
            <ATCWaypointType>User</ATCWaypointType>
            <WorldPosition>N65° 49' 49.24",W145° 24' 18.27",+002000.00</WorldPosition>
        </ATCWaypoint>
*/

export function parseFlightPlan(content: string): IFlightPlan {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/xml");
  const rawWaypoints = doc.querySelectorAll("ATCWaypoint");
  const outputWaypoints: IWaypoint[] = [];

  for (const rawWaypoint of rawWaypoints) {
    const rawPosition =
      rawWaypoint.querySelector("WorldPosition")!.textContent!;

    outputWaypoints.push({
      id: rawWaypoint.getAttribute("id")!,
      type:
        rawWaypoint.querySelector("ATCWaypointType")!.textContent === "Airport"
          ? WaypointType.Airport
          : WaypointType.User,
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
    /([NS])(\d+)°\s+(\d+)'\s+(\d+\.\d+)",([EW])(\d+)°\s+(\d+)'\s+(\d+\.\d+)"/
  );
  if (match) {
    const [, ns, nsD, nsM, nsS, ew, ewD, ewM, ewS] = match;
    // console.log(ns, nsD, nsM, nsS, ew, ewD, ewM, ewS);
    const rawLat =
      parseFloat(nsD) + parseFloat(nsM) / 60 + parseFloat(nsS) / 3600;
    const rawLong =
      parseFloat(ewD) + parseFloat(ewM) / 60 + parseFloat(ewS) / 3600;

    return {
      lat: ns === "N" ? rawLat : -rawLat,
      lng: ew === "E" ? rawLong : -rawLong,
    };
  } else {
    throw new Error("TODO");
  }
}
