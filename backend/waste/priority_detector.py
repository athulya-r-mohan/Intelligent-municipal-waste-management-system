import re
import urllib.request
import urllib.parse
import json

# ============================================================
# LOCATION-BASED PRIORITY DETERMINATION ENGINE
# ============================================================

# High priority keywords (Medical / Health facilities)
HIGH_PRIORITY_KEYWORDS = [
    r"\bhospital\b",
    r"\bhospitals\b",
    r"\bgovernment hospital\b",
    r"\bmedical college\b",
    r"\bmedical center\b",
    r"\bmedical centre\b",
    r"\bmedical facility\b",
    r"\bclinic\b",
    r"\bclinics\b",
    r"\bhealth centre\b",
    r"\bhealth center\b",
    r"\bprimary health centre\b",
    r"\bprimary health center\b",
    r"\bphc\b",
    r"\bdispensary\b",
    r"\bnursing home\b",
    r"\bhealthcare\b",
    r"\bhealth care\b",
    r"\bayurvedic hospital\b",
    r"\bhomeopathic hospital\b",
    r"\bdoctor\b",
    r"\bdoctors\b",
    r"\bpharmacy\b",
    r"\bdiagnostic\b",
    r"\bmaternity\b",
    r"\bemergency\b",
]

# Medium priority keywords (Educational institutions)
MEDIUM_PRIORITY_KEYWORDS = [
    r"\bschool\b",
    r"\bschools\b",
    r"\bcollege\b",
    r"\bcolleges\b",
    r"\buniversity\b",
    r"\buniversities\b",
    r"\beducational institution\b",
    r"\binstitution\b",
    r"\bchildcare\b",
    r"\bchild care\b",
    r"\bchildcare centre\b",
    r"\bkindergarten\b",
    r"\bdaycare\b",
    r"\bday care\b",
    r"\bplayschool\b",
    r"\bplay school\b",
    r"\bvidyalaya\b",
    r"\bacadeny\b",
    r"\bacademy\b",
    r"\bpolytechnic\b",
    r"\binstitute\b",
    r"\bcampus\b",
    r"\bmadrasa\b",
    r"\blibrary\b",
]

# OSM / Nominatim amenity/type mappings
OSM_HIGH_AMENITIES = {
    "hospital",
    "clinic",
    "doctors",
    "pharmacy",
    "health_post",
    "dentist",
    "nursing_home",
    "healthcare",
}

OSM_MEDIUM_AMENITIES = {
    "school",
    "college",
    "university",
    "kindergarten",
    "childcare",
    "library",
}


def _matches_keywords(text: str, patterns: list) -> bool:
    """Case-insensitive regex search for priority keywords."""
    if not text:
        return False
    lower_text = text.lower()
    for pattern in patterns:
        if re.search(pattern, lower_text, re.IGNORECASE):
            return True
    return False


def _check_osm_details(osm_data: dict) -> str | None:
    """Inspect structured Nominatim response for high or medium priority amenities."""
    if not isinstance(osm_data, dict):
        return None

    # Check category & type
    category = str(osm_data.get("category", "")).lower()
    osm_type = str(osm_data.get("type", "")).lower()
    amenity = str(osm_data.get("amenity", "")).lower()

    if (
        osm_type in OSM_HIGH_AMENITIES
        or amenity in OSM_HIGH_AMENITIES
        or category in ("healthcare", "health")
    ):
        return "HIGH"

    if (
        osm_type in OSM_MEDIUM_AMENITIES
        or amenity in OSM_MEDIUM_AMENITIES
        or category in ("education",)
    ):
        return "MEDIUM"

    address = osm_data.get("address", {})
    if isinstance(address, dict):
        # Check specific address keys
        for key in ("hospital", "clinic", "doctors", "pharmacy", "healthcare"):
            if key in address:
                return "HIGH"

        for key in ("school", "college", "university", "kindergarten"):
            if key in address:
                return "MEDIUM"

    return None


def determine_complaint_priority(
    location_name: str = "",
    latitude: float | None = None,
    longitude: float | None = None,
    extra_details: dict | None = None,
) -> str:
    """
    Determines public waste complaint priority based primarily on location:
      - HIGH: Medical & Healthcare facilities (Hospital, Clinic, PHC, etc.)
      - MEDIUM: Educational institutions (School, College, University, Kindergarten, etc.)
      - LOW: Normal roadsides, general public spaces, or safe fallback.
    Never raises an unhandled exception.
    """
    try:
        # 1. Inspect direct location name string
        loc_str = str(location_name or "").strip()

        if _matches_keywords(loc_str, HIGH_PRIORITY_KEYWORDS):
            return "HIGH"

        if _matches_keywords(loc_str, MEDIUM_PRIORITY_KEYWORDS):
            return "MEDIUM"

        # 2. Inspect extra details if passed (e.g. Nominatim address dict from frontend)
        if extra_details and isinstance(extra_details, dict):
            osm_priority = _check_osm_details(extra_details)
            if osm_priority:
                return osm_priority

            # Also check display_name or name inside extra_details
            extra_name = str(extra_details.get("display_name") or extra_details.get("name") or "")
            if _matches_keywords(extra_name, HIGH_PRIORITY_KEYWORDS):
                return "HIGH"
            if _matches_keywords(extra_name, MEDIUM_PRIORITY_KEYWORDS):
                return "MEDIUM"

        # 3. If coordinates are provided, perform a fast reverse geocode query if needed
        if latitude is not None and longitude is not None:
            try:
                lat = float(latitude)
                lon = float(longitude)
                # Query Nominatim with timeout and User-Agent
                url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
                req = urllib.request.Request(
                    url,
                    headers={
                        "User-Agent": "EcoPulseWasteManagement/1.0",
                        "Accept": "application/json",
                    },
                )
                with urllib.request.urlopen(req, timeout=2.5) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode("utf-8"))
                        osm_priority = _check_osm_details(data)
                        if osm_priority:
                            return osm_priority
                        
                        disp_name = data.get("display_name", "")
                        if _matches_keywords(disp_name, HIGH_PRIORITY_KEYWORDS):
                            return "HIGH"
                        if _matches_keywords(disp_name, MEDIUM_PRIORITY_KEYWORDS):
                            return "MEDIUM"
            except Exception:
                # Network or timeout failure - fallback safely
                pass

        # 4. Safe fallback
        return "LOW"

    except Exception:
        # Guaranteed safe fallback
        return "LOW"
