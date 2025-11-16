import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getRaces = async () => {
  const response = await api.get('/races');
  return response.data;
};

export const getRaceData = async (year, gp, session = 'R') => {
  const response = await api.get(`/race/${year}/${gp}/${session}`);
  return response.data;
};

export const getTrackCoordinates = async (year, gp) => {
  const response = await api.get(`/track/${year}/${gp}`);
  return response.data;
};

