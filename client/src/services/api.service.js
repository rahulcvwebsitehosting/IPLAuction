import axiosInstance from "../utilities/axiosInstance";

const API = {
  createRoom: (payload) =>
    axiosInstance.post("/api/rooms/create", payload).then((r) => r.data),

  getRoom: (code) =>
    axiosInstance.get(`/api/rooms/${code}`).then((r) => r.data),

  joinRoom: (code, payload) =>
    axiosInstance.post(`/api/rooms/${code}/join`, payload).then((r) => r.data),

  validateTeam: (code, team) =>
    axiosInstance
      .get(`/api/rooms/${code}/validate-team`, { params: { team } })
      .then((r) => r.data),

  getModes: () => axiosInstance.get("/api/modes").then((r) => r.data),

  getUserHistory: (username) =>
    axiosInstance.get(`/api/history/${username}`).then((r) => r.data),

  exportRoom: (code, format = "json") =>
    axiosInstance
      .get(`/api/rooms/${code}/export`, { params: { format } })
      .then((r) => r.data),
};

export default API;
