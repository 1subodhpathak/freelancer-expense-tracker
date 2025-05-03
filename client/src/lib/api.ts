import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:4000',  // Direct URL for development
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false  // Changed to false since we're using * for CORS
});

// Add a request interceptor for authentication if needed
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;