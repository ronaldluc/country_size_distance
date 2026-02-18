from pyproj import Geod
from shapely.geometry import Polygon

from scripts.build_dataset import clean_iso3, compute_area_km2, centroid_wgs84


def test_clean_iso3_prefers_iso_a3():
    row = {"ISO_A3": "CZE", "ADM0_A3": "XXX"}
    assert clean_iso3(row) == "CZE"


def test_clean_iso3_fallback_to_adm0_a3():
    row = {"ISO_A3": "-99", "ADM0_A3": "SVK"}
    assert clean_iso3(row) == "SVK"


def test_compute_area_km2_positive():
    geod = Geod(ellps="WGS84")
    polygon = Polygon([(0.0, 0.0), (0.0, 1.0), (1.0, 1.0), (1.0, 0.0)])
    area = compute_area_km2(geod, polygon)
    assert area > 0


def test_centroid_wgs84_in_range():
    polygon = Polygon([(14.0, 48.0), (14.0, 49.0), (15.0, 49.0), (15.0, 48.0)])
    center = centroid_wgs84(polygon)
    assert -90 <= center.y <= 90
    assert -180 <= center.x <= 180
