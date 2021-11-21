import { useEffect, useState } from "react";
import { IAirport, useAirportDB } from "./AirportDB";
import { IWaypoint } from "./FlightPlan";

import styles from "./FlightHeader.module.css";

export interface IFlightHeaderProps {
  start: IWaypoint;
  end: IWaypoint;
}

export function FlightHeader(props: IFlightHeaderProps) {
  const { start, end } = props;

  return (
    <h1 className={styles.header}>
      Group Flight: <WaypointDisplay point={start} /> to{" "}
      <WaypointDisplay point={end} /> [East USA Server]
    </h1>
  );
}

interface IWaypointDisplayProps {
  point: IWaypoint;
}

function WaypointDisplay(props: IWaypointDisplayProps) {
  const airportDB = useAirportDB();

  const [airport, setAirport] = useState<IAirport | undefined>();

  const { point } = props;
  useEffect(() => {
    setAirport(undefined);

    if (point.icao) {
      airportDB.getAirport(point.icao).then((result) => {
        setAirport(result);
      });
    }
  }, [point.icao]);

  if (airport) {
    return (
      <span>
        {point.id} ({airport.name})
      </span>
    );
  } else {
    return <span>{point.id}</span>;
  }
}
