import axios from "axios";

const API = axios.create({
    baseURL: "https://intelligent-municipal-waste-management.onrender.com/api"
});

export default API;