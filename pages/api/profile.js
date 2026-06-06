export default async function handler(req, res) {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "address param required" });
  try {
    const upstream = await fetch(
      `https://gamma-api.polymarket.com/profile/${address}`,
      { headers: { Accept: "application/json" } }
    );
    if (!upstream.ok) return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
