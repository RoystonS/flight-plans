import { useEffect, useState } from "react";
import { IAirport, useAirportDB } from "./AirportDB";
import { IFlightPlan, IWaypoint } from "./FlightPlan";

import styles from "./WaypointList.module.css";

const AirportDoesNotExist: IAirport = {
  name: "DOES NOT EXIST",
  elevation: 0,
  magneticVariation: 0,
};

export interface IWaypointListProps {
  plan: IFlightPlan;
}

export const WaypointList = (props: IWaypointListProps) => {
  const waypointEls = props.plan.waypoints.map((wp, i) => (
    <Waypoint key={i} waypoint={wp} />
  ));

  return (
    <div className={styles.root}>
      <ul>{waypointEls}</ul>
    </div>
  );
};

interface IWaypointProps {
  waypoint: IWaypoint;
}

const Waypoint = (props: IWaypointProps) => {
  const [airport, setAirport] = useState<IAirport | undefined>();

  const airportDB = useAirportDB();

  useEffect(() => {
    if (props.waypoint.icao) {
      void airportDB.getAirport(props.waypoint.icao).then((airport) => {
        if (airport) {
          setAirport(airport);
        } else {
          setAirport(AirportDoesNotExist);
        }
      });
    }
  }, [props.waypoint.icao]);

  const airportEl = airport ? (
    <>
      <div className={styles.airportName}>({airport.name})</div>
      <div>Elevation: {airport.elevation}ft</div>
      <div>Mag declination: {airport.magneticVariation}</div>
    </>
  ) : null;
  return (
    <li>
      <div className={styles.waypointId}>
        {props.waypoint.id}
        <br />
        {props.waypoint.rawPosition} ({props.waypoint.position.lat},{" "}
        {props.waypoint.position.lng})
      </div>{" "}
      {airportEl}
    </li>
  );
};
