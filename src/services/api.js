import axios from 'axios';

const api = axios.create({
    baseURL: "https://atqtuew6syxese-8080.proxy.runpod.net/api"
});

// Login function
export const login = async (credentials) => {
    return await api.post('/auth', credentials);
};

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token'); 
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
          const { data } = await axios.post('http://https://atqtuew6syxese-8080.proxy.runpod.net/api/auth/refresh');
          localStorage.setItem('token', data.accessToken); 
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