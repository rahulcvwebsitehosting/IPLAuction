const axios = require("axios");

// Backend URL is environment-driven so the same build works on Vercel (prod)
// and locally (dev). Set REACT_APP_API_URL in your Vercel project env vars
// to your deployed backend, e.g. https://your-app.onrender.com
const url = process.env.REACT_APP_API_URL || "http://localhost:8000/";

const axiosInstance = axios.create({
  withCredentials: true,
  baseURL: url,
});

export default axiosInstance;
