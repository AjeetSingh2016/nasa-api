import axios from "axios";

const API_BASE_URL = "https://images-api.nasa.gov"; // NASA Media API

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let endpoint;

  switch (type) {
    case "gallery":
      const query = searchParams.get("query");
      if (!query) {
        return new Response(JSON.stringify({ error: "Query is required" }), { status: 400 });
      }
      endpoint = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&media_type=image`;
      break;

    case "asset":
      const nasaId = searchParams.get("nasaId");
      if (!nasaId) {
        return new Response(JSON.stringify({ error: "NASA ID is required" }), { status: 400 });
      }
      endpoint = `${API_BASE_URL}/asset/${nasaId}`;
      break;

    default:
      return new Response(JSON.stringify({ error: "Invalid API type" }), { status: 400 });
  }

  // Fetch Data
  try {
    const response = await axios.get(endpoint);
    return new Response(JSON.stringify(response.data), { status: 200 });
  } catch (error) {
    console.error("NASA API Fetch Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch data", details: error.message }),
      { status: 500 }
    );
  }
}
