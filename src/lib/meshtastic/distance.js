// Haversine distance in meters between two lat/lon points
export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined || lon1 === undefined ||
    lat2 === undefined || lon2 === undefined ||
    lat1 === 0 || lat2 === 0
  ) return null;

  const R = 6371000; // Earth radius in meters
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance between a node and the "my node", in meters. null if not computable.
export function distanceToMyNode(node, myNode) {
  if (!myNode?.position?.latitude || !node?.position?.latitude) return null;
  return haversineDistance(
    myNode.position.latitude,
    myNode.position.longitude,
    node.position.latitude,
    node.position.longitude,
  );
}

export function formatDistance(meters) {
  if (meters === null || meters === undefined) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(2)} km`;
  return `${(meters / 1000).toFixed(1)} km`;
}