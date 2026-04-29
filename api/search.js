export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const query = req.query.q || "cricket live";
  try {
    const ytRes = await fetch(
      "https://www.googleapis.com/youtube/v3/search?part=snippet&q=" +
      encodeURIComponent(query) +
      "&type=video&eventType=live&maxResults=8&key=" +
      process.env.YT_API_KEY
    );
    const data = await ytRes.json();
    if (!data.items) return res.status(200).json({ results: [] });
    const results = data.items.map(item => ({
      title: item.snippet.title,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails.medium.url,
      channel: item.snippet.channelTitle
    }));
    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: "API failed" });
  }
}
