import axios from 'axios';

const api = axios.create({
    baseURL: process.env['API_URL'],
    withCredentials: true
});

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            api.post("/logout").then(() => {});
            document.cookie = "Sweetie-User-Vk-Id=; max-age=0; path=/";
            location.assign(process.env['FRONTEND_BASE_PATH'] + '/login');
        }
        return Promise.reject(error);
    }
);

export default api;
