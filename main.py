
@app.get("/api/cb-internal-test")
async def cb_internal():
    # Cricbuzz internal API used by their own frontend
    url = "https://www.cricbuzz.com/api/cricket-match/live-scores"
    try:
        async with httpx.AsyncClient(headers=SCRAPE_HEADERS, timeout=10) as client:
            r = await client.get(url)
            return {"status": r.status_code, "data": r.json()}
    except Exception as e:
        return {"error": str(e)}
