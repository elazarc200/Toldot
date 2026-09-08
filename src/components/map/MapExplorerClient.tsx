"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map as MaplibreMap,
  NavigationControl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  MapPlaceCandidateDto,
  MapPlaceDto,
  MapPersonPlaceDto,
} from "@/domain/visualization";

const STYLE_URL =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const MOBILE_MQ = "(max-width: 720px)";

export type MapExplorerClientProps = {
  places: MapPlaceDto[];
  candidates: MapPlaceCandidateDto[];
  personPlaces: MapPersonPlaceDto[];
  focusPlaceId?: string | null;
  focusPersonId?: string | null;
  focusPeriodId?: string | null;
};

type Selection =
  | { kind: "place"; place: MapPlaceDto }
  | { kind: "person"; personId: string; name: string; href: string; placeIds: string[] }
  | null;

function hasCoords(lat: number | null, lng: number | null): boolean {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

export function MapExplorerClient({
  places,
  candidates,
  personPlaces,
  focusPlaceId = null,
  focusPersonId = null,
  focusPeriodId = null,
}: MapExplorerClientProps) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [listTab, setListTab] = useState<"places" | "unlocated">("places");
  const [selection, setSelection] = useState<Selection>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const placeById = useMemo(
    () => new Map(places.map((p) => [p.place_id, p])),
    [places],
  );

  const filteredPlaces = useMemo(() => {
    if (!focusPeriodId) return places;
    return places.filter((p) => p.period_ids?.includes(focusPeriodId));
  }, [focusPeriodId, places]);

  const plottable = useMemo(() => {
    return filteredPlaces.filter(
      (p) =>
        (p.placement_kind === "point" || p.placement_kind === "multi_candidate") &&
        hasCoords(p.preferred_lat, p.preferred_lng),
    );
  }, [filteredPlaces]);

  const unlocated = useMemo(() => {
    return filteredPlaces.filter(
      (p) =>
        p.placement_kind === "unlocated" ||
        p.placement_kind === "region_context" ||
        !hasCoords(p.preferred_lat, p.preferred_lng),
    );
  }, [filteredPlaces]);

  const placesGeoJson = useMemo(() => {
    const features: Array<{
      type: "Feature";
      properties: Record<string, string | boolean | null>;
      geometry: { type: "Point"; coordinates: [number, number] };
    }> = [];
    for (const p of plottable) {
      if (p.placement_kind === "multi_candidate") {
        const cands = candidates.filter(
          (c) => c.place_id === p.place_id && hasCoords(c.latitude, c.longitude),
        );
        for (const c of cands) {
          features.push({
            type: "Feature",
            properties: {
              place_id: p.place_id,
              name: p.primary_name,
              candidate: true,
              preferred: c.is_preferred,
              identification_id: c.identification_id,
            },
            geometry: {
              type: "Point",
              coordinates: [c.longitude as number, c.latitude as number],
            },
          });
        }
        if (!cands.length && hasCoords(p.preferred_lat, p.preferred_lng)) {
          features.push({
            type: "Feature",
            properties: {
              place_id: p.place_id,
              name: p.primary_name,
              candidate: false,
              preferred: true,
            },
            geometry: {
              type: "Point",
              coordinates: [p.preferred_lng as number, p.preferred_lat as number],
            },
          });
        }
      } else if (hasCoords(p.preferred_lat, p.preferred_lng)) {
        features.push({
          type: "Feature",
          properties: {
            place_id: p.place_id,
            name: p.primary_name,
            candidate: false,
            preferred: true,
          },
          geometry: {
            type: "Point",
            coordinates: [p.preferred_lng as number, p.preferred_lat as number],
          },
        });
      }
    }
    return { type: "FeatureCollection" as const, features };
  }, [candidates, plottable]);

  const activityGeoJson = useMemo(() => {
    const features: Array<{
      type: "Feature";
      properties: Record<string, string | boolean | null>;
      geometry: { type: "Point"; coordinates: [number, number] };
    }> = [];
    for (const pp of personPlaces) {
      const place = placeById.get(pp.place_id);
      if (!place || !hasCoords(place.preferred_lat, place.preferred_lng)) continue;
      if (focusPeriodId && !place.period_ids?.includes(focusPeriodId)) continue;
      features.push({
        type: "Feature",
        properties: {
          person_id: pp.person_id,
          place_id: pp.place_id,
          name: pp.person_display_name,
          place_name: pp.place_display_name,
          person_href: pp.person_href,
        },
        geometry: {
          type: "Point",
          coordinates: [
            place.preferred_lng as number,
            place.preferred_lat as number,
          ],
        },
      });
    }
    return { type: "FeatureCollection" as const, features };
  }, [focusPeriodId, personPlaces, placeById]);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = new MaplibreMap({
      container: mapEl.current,
      style: STYLE_URL,
      center: [35.2, 31.8],
      zoom: 5.2,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("places", {
        type: "geojson",
        data: placesGeoJson,
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 42,
      });
      map.addSource("activity", {
        type: "geojson",
        data: activityGeoJson,
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 36,
      });

      map.addLayer({
        id: "places-clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#2f4a3a",
          "circle-radius": ["step", ["get", "point_count"], 16, 8, 20, 25, 26],
          "circle-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "places-cluster-count",
        type: "symbol",
        source: "places",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
        },
        paint: { "text-color": "#fffaf0" },
      });
      map.addLayer({
        id: "places-points",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "preferred"], true],
            "#3f6350",
            "#c4a35a",
          ],
          "circle-radius": 7,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#1c2420",
        },
      });

      map.addLayer({
        id: "activity-clusters",
        type: "circle",
        source: "activity",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#8a7048",
          "circle-radius": 14,
          "circle-opacity": 0.8,
        },
      });
      map.addLayer({
        id: "activity-points",
        type: "circle",
        source: "activity",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#c4a35a",
          "circle-radius": 5,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#5c5348",
        },
      });

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const placesSrc = map.getSource("places") as GeoJSONSource | undefined;
    const activitySrc = map.getSource("activity") as GeoJSONSource | undefined;
    placesSrc?.setData(placesGeoJson);
    activitySrc?.setData(activityGeoJson);
  }, [activityGeoJson, placesGeoJson, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const placeLayers = [
      "places-clusters",
      "places-cluster-count",
      "places-points",
    ];
    const activityLayers = ["activity-clusters", "activity-points"];
    for (const id of placeLayers) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", showPlaces ? "visible" : "none");
      }
    }
    for (const id of activityLayers) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(
          id,
          "visibility",
          showActivity ? "visible" : "none",
        );
      }
    }
  }, [ready, showActivity, showPlaces]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const onPlaceClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const placeId = f?.properties?.place_id as string | undefined;
      if (!placeId) return;
      const place = placeById.get(placeId);
      if (!place) return;
      setSelection({ kind: "place", place });
      setSheetOpen(true);
    };

    const onActivityClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const personId = f?.properties?.person_id as string | undefined;
      const name = f?.properties?.name as string | undefined;
      const href = f?.properties?.person_href as string | undefined;
      if (!personId) return;
      const placeIds = personPlaces
        .filter((pp) => pp.person_id === personId)
        .map((pp) => pp.place_id);
      setSelection({
        kind: "person",
        personId,
        name: name ?? personId,
        href: href ?? `/person/id/${personId}`,
        placeIds,
      });
      setSheetOpen(true);
    };

    const onClusterClick = (e: MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["places-clusters"],
      });
      const clusterId = features[0]?.properties?.cluster_id as number | undefined;
      const source = map.getSource("places") as GeoJSONSource;
      if (clusterId == null) return;
      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geom = features[0]?.geometry;
        if (!geom || geom.type !== "Point") return;
        const coords = geom.coordinates as [number, number];
        map.easeTo({ center: coords, zoom });
      });
    };

    map.on("click", "places-points", onPlaceClick);
    map.on("click", "activity-points", onActivityClick);
    map.on("click", "places-clusters", onClusterClick);
    map.on("mouseenter", "places-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "places-points", () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      map.off("click", "places-points", onPlaceClick);
      map.off("click", "activity-points", onActivityClick);
      map.off("click", "places-clusters", onClusterClick);
    };
  }, [placeById, personPlaces, ready]);

  const flyToPlace = (place: MapPlaceDto) => {
    const map = mapRef.current;
    if (!map || !hasCoords(place.preferred_lat, place.preferred_lng)) return;
    map.flyTo({
      center: [place.preferred_lng as number, place.preferred_lat as number],
      zoom: 9.5,
      essential: true,
    });
  };

  useEffect(() => {
    if (!ready) return;
    if (focusPlaceId) {
      const place = placeById.get(focusPlaceId);
      if (place) {
        setSelection({ kind: "place", place });
        setSheetOpen(true);
        flyToPlace(place);
      }
      return;
    }
    if (focusPersonId) {
      const links = personPlaces.filter((pp) => pp.person_id === focusPersonId);
      if (!links.length) return;
      const first = links[0]!;
      setSelection({
        kind: "person",
        personId: focusPersonId,
        name: first.person_display_name,
        href: first.person_href,
        placeIds: links.map((l) => l.place_id),
      });
      setSheetOpen(true);
      const place = placeById.get(first.place_id);
      if (place) flyToPlace(place);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusPlaceId, focusPersonId]);

  const panel = (
    <aside className="map-panel" aria-label="לוח מפה">
      <fieldset className="map-layers">
        <legend>שכבות</legend>
        <label className="seder-filter-row">
          <input
            type="checkbox"
            checked={showPlaces}
            onChange={(e) => setShowPlaces(e.target.checked)}
          />
          מקומות היסטוריים
        </label>
        <label className="seder-filter-row">
          <input
            type="checkbox"
            checked={showActivity}
            onChange={(e) => setShowActivity(e.target.checked)}
          />
          פעילות אנשים
        </label>
      </fieldset>

      {isMobile ? (
        <div className="map-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={listTab === "places"}
            className={listTab === "places" ? "active" : undefined}
            onClick={() => setListTab("places")}
          >
            על המפה
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listTab === "unlocated"}
            className={listTab === "unlocated" ? "active" : undefined}
            onClick={() => setListTab("unlocated")}
          >
            ללא נקודה
          </button>
        </div>
      ) : null}

      {(!isMobile || listTab === "places") && (
        <section>
          <h3>מקומות על המפה</h3>
          <ul className="map-place-list">
            {plottable.map((p) => (
              <li key={p.place_id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelection({ kind: "place", place: p });
                    setSheetOpen(true);
                    flyToPlace(p);
                  }}
                >
                  {p.primary_name}
                  {p.placement_kind === "multi_candidate"
                    ? " (מספר מועמדים)"
                    : ""}
                </button>
              </li>
            ))}
            {!plottable.length ? (
              <li className="muted">אין מקומות עם קואורדינטות מפורסמות.</li>
            ) : null}
          </ul>
        </section>
      )}

      {(!isMobile || listTab === "unlocated") && (
        <section>
          <h3>ללא נקודה / הקשר אזורי</h3>
          <ul className="map-place-list">
            {unlocated.map((p) => (
              <li key={p.place_id}>
                <Link href={p.href_path}>
                  {p.primary_name}
                  <span className="muted">
                    {" "}
                    —{" "}
                    {p.placement_kind === "region_context"
                      ? "הקשר אזורי"
                      : "ללא מיקום מדויק"}
                  </span>
                </Link>
                {p.region_labels?.length ? (
                  <span className="muted"> · {p.region_labels.join(", ")}</span>
                ) : null}
              </li>
            ))}
            {!unlocated.length ? (
              <li className="muted">אין רשומות ברשימה זו.</li>
            ) : null}
          </ul>
        </section>
      )}

      {!isMobile && selection ? (
        <SelectionCard
          selection={selection}
          placeById={placeById}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </aside>
  );

  return (
    <div className={`map-explorer${isMobile ? " map-explorer-mobile" : ""}`}>
      {panel}
      <div className="map-stage" ref={mapEl} role="application" aria-label="מפה אינטראקטיבית" />

      {isMobile && sheetOpen && selection ? (
        <div className="map-sheet seder-sheet" role="dialog" aria-modal="true">
          <div className="seder-sheet-handle" aria-hidden="true" />
          <SelectionCard
            selection={selection}
            placeById={placeById}
            onClose={() => {
              setSheetOpen(false);
              setSelection(null);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function SelectionCard({
  selection,
  placeById,
  onClose,
}: {
  selection: NonNullable<Selection>;
  placeById: Map<string, MapPlaceDto>;
  onClose: () => void;
}) {
  if (selection.kind === "place") {
    const p = selection.place;
    return (
      <section className="map-selection">
        <header className="seder-sheet-header">
          <h3>{p.primary_name}</h3>
          <button type="button" className="button button-secondary" onClick={onClose}>
            סגור
          </button>
        </header>
        <p className="muted">
          {p.placement_kind === "multi_candidate"
            ? "זיהוי מרובה מועמדים"
            : p.placement_kind === "point"
              ? "נקודה"
              : p.placement_kind}
        </p>
        {p.region_labels?.length ? (
          <p className="muted">אזורים: {p.region_labels.join(" · ")}</p>
        ) : null}
        <p className="nav">
          <Link className="button" href={p.href_path}>
            לערך המקום
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="map-selection">
      <header className="seder-sheet-header">
        <h3>{selection.name}</h3>
        <button type="button" className="button button-secondary" onClick={onClose}>
          סגור
        </button>
      </header>
      <p className="nav">
        <Link className="button" href={selection.href}>
          לערך האדם
        </Link>
        <Link
          className="button button-secondary"
          href={`/seder-hadorot?person=${selection.personId}&intent=focus`}
        >
          הצג בסדר הדורות
        </Link>
      </p>
      <h4>מקומות קשורים</h4>
      <ul className="rel-list">
        {selection.placeIds.map((id) => {
          const pl = placeById.get(id);
          return (
            <li key={id}>
              {pl ? (
                <Link href={pl.href_path}>{pl.primary_name}</Link>
              ) : (
                <span className="ltr-isolate">{id}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
