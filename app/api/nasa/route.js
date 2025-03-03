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

// API route handler function
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { type, rover, id, lat, lon, query } = req.query;
  let endpoint;

  try {
    switch (type) {
      case "apod":
        endpoint = `${API_BASE_URL}/planetary/apod?api_key=${API_KEY}`;
        break;

      case "mars":
        endpoint = `${API_BASE_URL}/mars-photos/api/v1/rovers/${
          rover || "curiosity"
        }/photos?sol=1000&api_key=${API_KEY}`;
        break;

      case "asteroids":
        endpoint = `${API_BASE_URL}/neo/rest/v1/feed?start_date=2024-02-27&api_key=${API_KEY}`;
        break;

      case "asteroid-feed":
        const today = new Date().toISOString().split("T")[0];
        endpoint = `${API_BASE_URL}/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${API_KEY}`;
        break;

      case "asteroid-by-id":
        if (!id)
          return res.status(400).json({ error: "Asteroid ID is required" });
        endpoint = `${API_BASE_URL}/neo/rest/v1/neo/${id}?api_key=${API_KEY}`;
        break;

      case "asteroids-browse":
        endpoint = `${API_BASE_URL}/neo/rest/v1/neo/browse?api_key=${API_KEY}`;
        break;

      case "exoplanets":
        endpoint = `${API_BASE_URL}/exoplanet_archive/table?api_key=${API_KEY}`;
        break;

      case "earth-imagery":
        if (!lat || !lon)
          return res
            .status(400)
            .json({ error: "Latitude and Longitude are required" });
        endpoint = `${API_BASE_URL}/planetary/earth/imagery?lon=${lon}&lat=${lat}&api_key=${API_KEY}`;
        break;

      case "space-weather":
        const { startDate, endDate } = getDateRange();
        const [cmeResponse, gstResponse, flrResponse] = await Promise.all([
          axios.get(
            `${API_BASE_URL}/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`
          ),
          axios.get(
            `${API_BASE_URL}/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`
          ),
          axios.get(
            `${API_BASE_URL}/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`
          ),
        ]);

        return res.status(200).json({
          CME: cmeResponse.data,
          GST: gstResponse.data,
          FLR: flrResponse.data,
        });

      case "epic":
        const epicResponse = await axios.get(
          `${EPIC_BASE_URL}/images?api_key=${API_KEY}`
        );
        const epicData = epicResponse.data;

        if (!epicData.length)
          return res.status(200).json({ message: "No EPIC images available" });

        const formattedData = epicData.map((item, index) => {
          const [year, month, day] = item.date.split(" ")[0].split("-");
          const imageUrl = `${EPIC_IMAGE_BASE_URL}/${year}/${month}/${day}/png/${item.image}.png?api_key=${API_KEY}`;

          return {
            id: index,
            imageUrl,
            rawDate: item.date,
            date: new Date(item.date).toLocaleString("en-US"),
            caption: item.caption,
            lat: item.centroid_coordinates.lat.toFixed(2),
            lon: item.centroid_coordinates.lon.toFixed(2),
          };
        });

        return res.status(200).json(formattedData);

      // ✅ NASA Media Library Search (fetchGallery)
      case "fetchGallery":
        if (!query)
          return res.status(400).json({ error: "Search query is required" });

        endpoint = `https://images-api.nasa.gov/search?q=${query}`;
        break;

      // ✅ NASA Assets (fetchAssets)
      case "fetchAssets":
        if (!id) return res.status(400).json({ error: "Asset ID is required" });

        endpoint = `https://images-api.nasa.gov/asset/${id}`;
        break;

      default:
        return res.status(400).json({ error: "Invalid API type" });
    }

    // Fetch data from the selected NASA API
    const response = await axios.get(endpoint);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("NASA API Fetch Error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch data", details: error.message });
  }
}
