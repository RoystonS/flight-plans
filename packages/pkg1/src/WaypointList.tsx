import React, { useEffect, useState } from "react";
import { IAirport, IRunway, IRunwayEnd, useAirportDB } from "./AirportDB";
import { IFlightPlan, IWaypoint } from "./FlightPlan";

import styles from "./WaypointList.module.css";

const AirportDoesNotExist: IAirport = {
  name: "DOES NOT EXIST",
  elevation: 0,
  magneticVariation: 0,
  runways: [],
};

export interface IWaypointListProps {
  plan: IFlightPlan;
}

type CoordType = "hide" | "dms" | "decimal";

function getDefaultCoordType(): CoordType {
  return (localStorage.getItem("coordType") as CoordType) || "hide";
}

export const WaypointList = (props: IWaypointListProps) => {
  const [coordType, setCoordType] = useState<CoordType>(getDefaultCoordType);

  const waypointEls = props.plan.waypoints.map((wp, i) => (
    <Waypoint key={i} waypoint={wp} coordType={coordType} />
  ));

  function handleChangeCoordinateType(e: React.ChangeEvent<HTMLSelectElement>) {
    setCoordType(e.target.value as CoordType);
    localStorage.setItem("coordType", e.target.value);
  }

  return (
    <div className={styles.root}>
      <label>
        Coordinate type:
        <select onChange={handleChangeCoordinateType} value={coordType}>
          <option value="hide">Hide</option>
          <option value="dms">Degrees {"\u00B0"} Minutes ' Seconds "</option>
          <option value="decimal">Decimal</option>
        </select>
      </label>
      <ul>{waypointEls}</ul>
    </div>
  );
};

interface IWaypointProps {
  waypoint: IWaypoint;
  coordType: CoordType;
}

const Waypoint = (props: IWaypointProps) => {
  const [airport, setAirport] = useState<IAirport | undefined>();

  const { waypoint, coordType } = props;

  const airportDB = useAirportDB();

  useEffect(() => {
    if (waypoint.type === "airport" && waypoint.icao) {
      void airportDB.getAirport(waypoint.icao).then((airport) => {
        if (airport) {
          setAirport(airport);
        } else {
          setAirport(AirportDoesNotExist);
        }
      });
    }
  }, [waypoint.type, waypoint.icao]);

  const airportEl = airport ? (
    <>
      <div className={styles.airport}>
        Mag declination: {formatDeclination(airport.magneticVariation)}
        <br />
        {airport.runways.map((rwy, i) => (
          <Runway key={i} runway={rwy} />
        ))}
      </div>
    </>
  ) : null;

  let positionText = null;
  switch (coordType) {
    case "decimal":
      positionText = `(${waypoint.position.lat}, ${waypoint.position.lng})`;
      break;
    case "dms":
      // TODO: not altitude
      positionText = waypoint.rawPosition;
      break;
  }

  const waypointTitle = waypoint.id + (airport ? ` (${airport.name})` : "");

  return (
    <li>
      <div className={styles.waypointId}>
        <h2 className={styles.airportName}>{waypointTitle}</h2>
      </div>
      {airportEl}
      {positionText}
    </li>
  );
};

function formatDeclination(value: number) {
  var sign = Math.sign(value);
  return Math.abs(value) + "\u00B0 " + (sign ? "E" : "W");
}

interface IRunwayProps {
  runway: IRunway;
}

const Runway = (props: IRunwayProps) => {
  const { runway } = props;
  return (
    <div className={styles.runway}>
      <h3 className={styles.runwayName}>
        Runway {runway.end1.name}/{runway.end2.name} ({runway.surface})
      </h3>
      <div className={styles.runwaySizeAndPos}>
        <div className={styles.runwaySize}>
          {runway.length}x{runway.width}ft
        </div>
        @<div className={styles.runwayElevation}>{runway.elevation}ft</div>
      </div>
      <div className={styles.runwayEnds}>
        <RunwayEnd end={runway.end1} />
        <RunwayEnd end={runway.end2} />
      </div>
    </div>
  );
};

interface IRunwayEndProps {
  end: IRunwayEnd;
}

const RunwayEnd = (props: IRunwayEndProps) => {
  const { end } = props;

  const closedChar = end.closed ? "\u274c" : "";

  const className =
    styles.runwayEndName + " " + (end.closed ? styles.runwayEndClosed : "");

  const offsetEl =
    end.offsetThreshold > 0 ? (
      <div className={styles.runwayEndDisplaced}>
        Disp. thres {end.offsetThreshold}ft
      </div>
    ) : null;

  return (
    <div className={styles.runwayEnd}>
      <h4 className={className}>
        {closedChar}
        {end.name}
        &nbsp; ({end.heading}
        {"\u00B0"}M)
      </h4>
      {offsetEl}
    </div>
  );
};
