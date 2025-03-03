import axios from "axios";

const API_BASE_URL = "https://api.nasa.gov";
const API_KEY = process.env.NASA_API_KEY; // Use an environment variable

// Function to get the date range for space weather APIs
const getDateRange = () => {
  const today = new Date();
  const pastWeek = new Date();
  pastWeek.setDate(today.getDate() - 7);

  const formatDate = (date) => date.toISOString().split("T")[0];

  return {
    startDate: formatDate(pastWeek),
    endDate: formatDate(today),
  };
};

// Main API handler function
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let endpoint;

  switch (type) {
    case "apod": // Astronomy Picture of the Day
      endpoint = `${API_BASE_URL}/planetary/apod?api_key=${API_KEY}`;
      break;

    case "mars": // Mars Rover Photos
      const rover = searchParams.get("rover") || "curiosity";
      endpoint = `${API_BASE_URL}/mars-photos/api/v1/rovers/${rover}/photos?sol=1000&api_key=${API_KEY}`;
      break;

    case "asteroids": // Asteroid Feed (Static Date)
      endpoint = `${API_BASE_URL}/neo/rest/v1/feed?start_date=2024-02-27&api_key=${API_KEY}`;
      break;

    case "asteroid-feed": // Today's Asteroid Feed
      const today = new Date().toISOString().split("T")[0];
      endpoint = `${API_BASE_URL}/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${API_KEY}`;
      break;

    case "asteroid-by-id": // Get specific asteroid details by ID
      const asteroidId = searchParams.get("id");
      if (!asteroidId) {
        return new Response(JSON.stringify({ error: "Asteroid ID is required" }), { status: 400 });
      }
      endpoint = `${API_BASE_URL}/neo/rest/v1/neo/${asteroidId}?api_key=${API_KEY}`;
      break;

    case "asteroids-browse": // Browse asteroid data
      endpoint = `${API_BASE_URL}/neo/rest/v1/neo/browse?api_key=${API_KEY}`;
      break;

    case "exoplanets": // Exoplanet Archive
      endpoint = `${API_BASE_URL}/exoplanet_archive/table?api_key=${API_KEY}`;
      break;

    case "earth-imagery": // Earth Imagery by NASA
      const lat = searchParams.get("lat");
      const lon = searchParams.get("lon");
      if (!lat || !lon) {
        return new Response(JSON.stringify({ error: "Latitude and Longitude are required" }), { status: 400 });
      }
      endpoint = `${API_BASE_URL}/planetary/earth/imagery?lon=${lon}&lat=${lat}&api_key=${API_KEY}`;
      break;

    case "space-weather": // Space Weather Data (CME, GST, FLR)
      const { startDate, endDate } = getDateRange();
      try {
        const [cmeResponse, gstResponse, flrResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`),
          axios.get(`${API_BASE_URL}/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`),
          axios.get(`${API_BASE_URL}/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`),
        ]);

        return new Response(
          JSON.stringify({
            CME: cmeResponse.data,
            GST: gstResponse.data,
            FLR: flrResponse.data,
          }),
          { status: 200 }
        );
      } catch (error) {
        console.error("NASA API Fetch Error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch space weather data", details: error.message }),
          { status: 500 }
        );
      }

    default:
      return new Response(JSON.stringify({ error: "Invalid API type" }), { status: 400 });
  }

  // Fetch data from the API
  try {
    const response = await axios.get(endpoint);
    return new Response(JSON.stringify(response.data), { status: 200 });
  } catch (error) {
    console.error("NASA API Fetch Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch data", details: error.message }), { status: 500 });
  }
}
