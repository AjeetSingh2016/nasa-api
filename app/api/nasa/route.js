import axios from "axios";

const API_BASE_URL = "https://api.nasa.gov";
const API_KEY = process.env.NASA_API_KEY; // Use an environment variable

const EPIC_BASE_URL = `${API_BASE_URL}/EPIC/api/natural`;
const EPIC_IMAGE_BASE_URL = "https://epic.gsfc.nasa.gov/archive/natural";

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
      if (!asteroidId) {
        return new Response(JSON.stringify({ error: "Asteroid ID is required" }), { status: 400 });
      }
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
      if (!lat || !lon) {
        return new Response(JSON.stringify({ error: "Latitude and Longitude are required" }), { status: 400 });
      }
      endpoint = `${API_BASE_URL}/planetary/earth/imagery?lon=${lon}&lat=${lat}&api_key=${API_KEY}`;
      break;

    case "space-weather":
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

    case "epic":
      try {
        const response = await axios.get(`${EPIC_BASE_URL}/images?api_key=${API_KEY}`);
        const data = response.data;

        if (data.length === 0) {
          return new Response(JSON.stringify({ message: "No EPIC images available" }), { status: 200 });
        }

        const formattedData = data.map((item, index) => {
          const [year, month, day] = item.date.split(" ")[0].split("-");
          const dateObj = new Date(item.date);
          const formattedDate = dateObj.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          const imageUrl = `${EPIC_IMAGE_BASE_URL}/${year}/${month}/${day}/png/${item.image}.png?api_key=${API_KEY}`;

          return {
            id: index,
            imageUrl,
            rawDate: item.date,
            date: formattedDate,
            caption: item.caption,
            lat: item.centroid_coordinates.lat.toFixed(2),
            lon: item.centroid_coordinates.lon.toFixed(2),
          };
        });

        return new Response(JSON.stringify(formattedData), { status: 200 });
      } catch (error) {
        console.error("Error fetching EPIC data:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch EPIC data", details: error.message }), { status: 500 });
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
