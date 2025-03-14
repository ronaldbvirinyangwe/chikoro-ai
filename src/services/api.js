import axios from 'axios';

const api = axios.create({
    baseURL: "https://chikoro-ai.com/api"
});

// Login function
export const login = async (credentials) => {
    return await api.post('/auth', credentials);
};

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token'); // Match the token key used in AuthContext
  if (token) {
      config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(response => response, async (error) => {
  const originalRequest = error.config;
  
  if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
          const { data } = await axios.post('http://chikoro-ai.com/api/auth/refresh');
          localStorage.setItem('token', data.accessToken); // Match the token key used in AuthContext
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
      } catch (refreshError) {
          localStorage.removeItem('token');
          window.location = '/login';
          return Promise.reject(refreshError);
      }
  }
  
  return Promise.reject(error);
});

export default api;
