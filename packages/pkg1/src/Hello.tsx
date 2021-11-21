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
import { useEffect, useRef } from "react";

import "leaflet/dist/leaflet.css";

import style from "./Hello.module.css";
import { parseFlightPlan } from "./FlightPlan";

export interface IHelloProps {
  name: string;
}

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

export function Hello(props: IHelloProps) {
  const mapElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    void tryFlightPlan().then((fp) => {
      const points = fp.waypoints.map((wp) => wp.position);

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

      for (const wp of fp.waypoints) {
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
              html: wp === fp.waypoints[0] ? "🛫" : "🛬",
              className: style.airportMarker,
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
        { maxZoom: 7 }
      );
    });
  });

  return (
    <div className={style.root}>
      <div className={style.map} ref={mapElRef}></div>
    </div>
  );
}

async function tryFlightPlan() {
  const request = await fetch("./plan2.pln");
  const text = await request.text();
  return parseFlightPlan(text);
}
