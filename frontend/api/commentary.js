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
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an energetic cricket commentator. Always respond with exactly 2 exciting sentences of commentary in ${language || "English"}. No extra text, just the commentary.`
          },
          {
            role: "user",
            content: `Ball result: ${ball}. Match: ${match}. Give live commentary now.`
          }
        ],
        max_tokens: 150,
        temperature: 0.9
      })
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "Great delivery!";
    res.status(200).json({ commentary: text });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}
