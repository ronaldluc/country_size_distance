from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
from pyproj import Geod, Transformer
from shapely.geometry import MultiPolygon, Point, Polygon
from shapely.ops import transform

BRNO_LAT = 49.1951
BRNO_LON = 16.6068

COUNTRIES_URL = "https://naturalearth.s3.amazonaws.com/110m_cultural/ne_110m_admin_0_countries.zip"
POPULATED_PLACES_URL = "https://naturalearth.s3.amazonaws.com/110m_cultural/ne_110m_populated_places.zip"

TO_EQUAL_AREA = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True)
TO_WGS84 = Transformer.from_crs("EPSG:6933", "EPSG:4326", always_xy=True)


@dataclass(frozen=True)
class CapitalPoint:
    lat: float
    lon: float
    name: str


def clean_iso3(row: gpd.GeoSeries) -> str | None:
    for key in ("ISO_A3", "ADM0_A3"):
        value = row.get(key)
        if isinstance(value, str) and len(value) == 3 and value != "-99":
            return value.upper()
    return None


def compute_area_km2(geod: Geod, geometry: Polygon | MultiPolygon) -> float:
    area_m2, _ = geod.geometry_area_perimeter(geometry)
    return abs(area_m2) / 1_000_000.0


def pick_capitals() -> dict[str, CapitalPoint]:
    places = gpd.read_file(POPULATED_PLACES_URL)
    cap = places[places["FEATURECLA"].isin(["Admin-0 capital", "Admin-0 capital alt"])].copy()
    cap = cap[cap["ADM0_A3"].notna()]

    capitals: dict[str, CapitalPoint] = {}
    for _, row in cap.iterrows():
        iso3 = str(row["ADM0_A3"]).upper()
        if iso3 in capitals:
            continue
        capitals[iso3] = CapitalPoint(
            lat=float(row["LATITUDE"]),
            lon=float(row["LONGITUDE"]),
            name=str(row["NAME"]),
        )
    return capitals


def centroid_wgs84(geometry: Polygon | MultiPolygon) -> Point:
    # Geometry is projected to equal-area CRS for centroid stability.
    projected = transform(TO_EQUAL_AREA.transform, geometry)
    centroid_projected = projected.centroid
    centroid_lonlat = transform(TO_WGS84.transform, centroid_projected)
    if not isinstance(centroid_lonlat, Point):
        raise ValueError("Centroid conversion failed")
    return centroid_lonlat


def build_dataset() -> dict:
    geod = Geod(ellps="WGS84")
    countries = gpd.read_file(COUNTRIES_URL).to_crs("EPSG:4326")
    capitals = pick_capitals()

    output_rows: list[dict] = []
    for _, row in countries.iterrows():
        geometry = row.geometry
        if geometry is None or geometry.is_empty:
            continue
        if not isinstance(geometry, (Polygon, MultiPolygon)):
            continue

        iso3 = clean_iso3(row)
        if not iso3:
            continue

        area_km2 = compute_area_km2(geod, geometry)

        point_source = "centroid"
        capital_name: str | None = None
        try:
            point = centroid_wgs84(geometry)
            lat = float(point.y)
            lon = float(point.x)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise ValueError("centroid out of range")
        except Exception:
            capital = capitals.get(iso3)
            if capital is None:
                continue
            point_source = "capital_fallback"
            capital_name = capital.name
            lat = capital.lat
            lon = capital.lon

        _, _, distance_m = geod.inv(BRNO_LON, BRNO_LAT, lon, lat)

        output_rows.append(
            {
                "iso3": iso3,
                "name": str(row["NAME_LONG"]),
                "continent": str(row["CONTINENT"]),
                "area_km2": round(area_km2, 2),
                "distance_km_from_brno": round(distance_m / 1000.0, 2),
                "point_source": point_source,
                "point_lat": round(lat, 6),
                "point_lon": round(lon, 6),
                **({"capital_name": capital_name} if capital_name else {}),
            }
        )

    output_rows.sort(key=lambda x: x["name"])

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generator_version": "0.1.0",
        "brno_reference": {"name": "Brno, Czechia", "lat": BRNO_LAT, "lon": BRNO_LON},
        "countries": output_rows,
    }


def main() -> None:
    data = build_dataset()
    out_path = Path("data/processed/countries_distance_area.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(data['countries'])} countries to {out_path}")


if __name__ == "__main__":
    main()
