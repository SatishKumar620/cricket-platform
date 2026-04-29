export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { ball, match, language } = req.query;
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [{
          role: "user",
          content: `You are an exciting cricket commentator. Generate 2 sentences of live commentary in ${language || "English"} for this ball: "${ball}" in match "${match}". Be energetic and natural.`
        }],
        max_tokens: 100
      })
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    res.status(200).json({ commentary: text });
  } catch(err) {
    res.status(500).json({ error: "Commentary failed" });
  }
}
