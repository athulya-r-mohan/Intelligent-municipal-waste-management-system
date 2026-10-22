import axios from "axios";

export const BASE_URL = "https://intelligent-municipal-waste-management.onrender.com";
export const API_BASE_URL = "https://intelligent-municipal-waste-management.onrender.com/api";

const API = axios.create({
    baseURL: API_BASE_URL
});

export default API;