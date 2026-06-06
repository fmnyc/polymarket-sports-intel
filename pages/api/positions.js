export default async function handler(req, res) {
  const { user, limit = 50 } = req.query;
  if (!user) return res.status(400).json({ error: "user param required" });
  try {
    const upstream = await fetch(
      `https://data-api.polymarket.com/positions?user=${user}&sizeThreshold=0.01&limit=${limit}`,
      { headers: { Accept: "application/json" } }
    );
    if (!upstream.ok) return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
