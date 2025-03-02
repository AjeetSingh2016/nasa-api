import axios from "axios";

const API_BASE_URL = "https://api.nasa.gov";
const API_KEY = process.env.NASA_API_KEY; // Use an environment variable

const getDateRange = () => {
  const today = new Date();
  const pastWeek = new Date();
  pastWeek.setDate(today.getDate() - 7);

  const formatDate = (date) => date.toISOString().split("T")[0];
  return { startDate: formatDate(pastWeek), endDate: formatDate(today) };
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let endpoint;

  switch (type) {
    case "apod":
      endpoint = `${API_BASE_URL}/planetary/apod?api_key=${API_KEY}`;
      break;
      
    case "mars":
      const rover = searchParams.get("rover") || "curiosity";
      endpoint = `${API_BASE_URL}/mars-photos/api/v1/rovers/${rover}/photos?sol=1000&api_key=${API_KEY}`;
      break;

    case "asteroids":
      endpoint = `${API_BASE_URL}/neo/rest/v1/feed?start_date=2024-02-27&api_key=${API_KEY}`;
      break;

    case "asteroid-feed":
      const today = new Date().toISOString().split("T")[0];
      endpoint = `${API_BASE_URL}/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${API_KEY}`;
      break;

    case "asteroid-by-id":
      const asteroidId = searchParams.get("id");
      if (!asteroidId) return Response.json({ error: "Asteroid ID is required" }, { status: 400 });
      endpoint = `${API_BASE_URL}/neo/rest/v1/neo/${asteroidId}?api_key=${API_KEY}`;
      break;

    case "asteroids-browse":
      endpoint = `${API_BASE_URL}/neo/rest/v1/neo/browse?api_key=${API_KEY}`;
      break;

    case "exoplanets":
      endpoint = `${API_BASE_URL}/exoplanet_archive/table?api_key=${API_KEY}`;
      break;

    case "earth-imagery":
      const lat = searchParams.get("lat");
      const lon = searchParams.get("lon");
      if (!lat || !lon) return Response.json({ error: "Latitude and Longitude are required" }, { status: 400 });
      endpoint = `${API_BASE_URL}/planetary/earth/imagery?lon=${lon}&lat=${lat}&api_key=${API_KEY}`;
      break;

    case "space-weather":
      const { startDate, endDate } = getDateRange();
      const [cmeResponse, gstResponse, flrResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`),
        axios.get(`${API_BASE_URL}/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`),
        axios.get(`${API_BASE_URL}/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`)
      ]);
      return Response.json({ CME: cmeResponse.data, GST: gstResponse.data, FLR: flrResponse.data });

    default:
      return Response.json({ error: "Invalid API type" }, { status: 400 });
  }

  try {
    const response = await axios.get(endpoint);
    return Response.json(response.data);
  } catch (error) {
    console.error("NASA API Fetch Error:", error);
    return Response.json({ error: "Failed to fetch data", details: error.message }, { status: 500 });
  }
}
