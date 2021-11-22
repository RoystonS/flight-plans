import {
  map,
  tileLayer,
  marker,
  circle,
  CircleMarkerOptions,
  polyline,
  Marker,
  DivIcon,
  point,
} from "leaflet";
import { useEffect, useRef, useState } from "react";

import "leaflet/dist/leaflet.css";

import styles from "./Main.module.css";
import { IFlightPlan, parseFlightPlan } from "./FlightPlan";
import { AirportDB, AirportDBContext } from "./AirportDB";
import { WaypointList } from "./WaypointList";
import { Upload } from "./Upload";
import { FlightHeader } from "./FlightHeader";

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

const airportDb = new AirportDB();

export function Main() {
  const mapElRef = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState<IFlightPlan | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!plan) {
      return;
    }

    const lmap = map(mapElRef.current!);

    tileLayer(
      `https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: "mapbox/satellite-v9",
        tileSize: 512,
        zoomOffset: -1,
        accessToken: MAPBOX_TOKEN,
      }
    ).addTo(lmap);

    const points = plan.waypoints.map((wp) => wp.position);

    const line = polyline(points, {
      color: "red",
      weight: 3,
      opacity: 0.5,
      smoothFactor: 1,
    });
    line.addTo(lmap);

    // TODO: cope with wraparound?
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const wp of plan.waypoints) {
      minLat = Math.min(minLat, wp.position.lat);
      maxLat = Math.max(maxLat, wp.position.lat);
      minLng = Math.min(minLng, wp.position.lng);
      maxLng = Math.max(maxLng, wp.position.lng);

      const opts: CircleMarkerOptions = wp.icao
        ? {
            color: "yellow",
            fillColor: "yellow",
            fillOpacity: 0.5,
            radius: 200,
          }
        : {
            color: "red",
            fillColor: "#f03",
            fillOpacity: 0.5,
            radius: 100,
          };
      const c = circle(wp.position, opts);
      c.addTo(lmap);

      if (wp.icao) {
        const m = new Marker(wp.position, {
          icon: new DivIcon({
            html: wp === plan.waypoints[0] ? "\uD83D\uDEEB" : "\uD83D\uDEEC",
            className: styles.airportMarker,
          }),
        }).bindTooltip(wp.icao, {
          permanent: true,
          direction: "top",
          offset: point(0, -5),
        });
        m.addTo(lmap);
      }
    }

    lmap.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { maxZoom: 10 }
    );
  }, [plan]);

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!plan) {
    const sparams = new URLSearchParams(window.location.search);
    const planId = sparams.get("plan");
    if (planId && planId.match(/^[-A-Z0-9]+$/i)) {
      async function fetchPlan() {
        const request = await fetch(`./plans/${planId}.pln`);

        if (request.status === 200) {
          const buffer = await request.arrayBuffer();
          const decoder = new TextDecoder("utf8");
          const text = decoder.decode(buffer);
          const newPlan = parseFlightPlan(text);
          setPlan(newPlan);
        } else {
          setError("Could not load specified flight plan");
        }
      }
      void fetchPlan();
      return <div>Loading...</div>;
    } else {
      function handleUpload(text: string) {
        const newPlan = parseFlightPlan(text);
        setPlan(newPlan);
      }
      return <Upload onUpload={handleUpload} />;
    }
  }

  const start = plan.waypoints[0];
  const end = plan.waypoints[plan.waypoints.length - 1];

  return (
    <AirportDBContext.Provider value={airportDb}>
      <div className={styles.root}>
        <header className={styles.header}>
          <FlightHeader start={start} end={end} />
        </header>
        <div className={styles.map} ref={mapElRef}></div>
        {plan ? (
          <div className={styles.waypointList}>
            <WaypointList plan={plan} />
          </div>
        ) : null}
      </div>
    </AirportDBContext.Provider>
  );
}
