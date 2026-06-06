export default async function handler(req, res) {
  const { category = 1, limit = 25, sortBy = "profit", timeWindow = "all" } = req.query;
  try {
    const upstream = await fetch(
      `https://data-api.polymarket.com/leaderboard?category=${category}&limit=${limit}&sortBy=${sortBy}&timeWindow=${timeWindow}`,
      { headers: { Accept: "application/json" } }
    );
    if (!upstream.ok) return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}