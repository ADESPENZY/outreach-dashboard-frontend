import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export const clearClientAuthState = () => {
  sessionStorage.removeItem('access');
  sessionStorage.removeItem('csrf_token');
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
};

// Silent session recovery: exchange the httpOnly refresh cookie for a new
// access token. Used by AuthContext on boot when this tab's sessionStorage
// is empty (fresh tab / restored session). Raw axios — NOT the `api`
// instance — so a 401 here stays a plain rejection and never triggers the
// interceptor's clear-and-redirect guards on public pages.
export const trySilentRefresh = async () => {
  const { data } = await axios.post(
    `${BASE_URL}/api/accounts/auth/refresh/`,
    {},
    { withCredentials: true }
  );
  sessionStorage.setItem('access', data.access);
  return data.access;
};

let _isRefreshing = false;
let _refreshQueue = [];

const processQueue = (error, token = null) => {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  _refreshQueue = [];
};

api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem("access");
        if(token){
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401) {
            const isAuthPage = window.location.pathname === '/' || window.location.pathname === '/register';

            // Guard 0: Auth endpoints that issue tokens can never benefit from a
            // refresh cycle — let the original error propagate immediately so that
            // callers (e.g. LoginPage) receive the real 401 instead of a secondary
            // 400 from the refresh endpoint.
            if (
                originalRequest.url?.includes('/auth/login/') ||
                originalRequest.url?.includes('/auth/register/')
            ) {
                return Promise.reject(error);
            }

            // Guard 1: Don't refresh the refresh endpoint itself
            if (originalRequest.url?.includes('/auth/refresh/')) {
                clearClientAuthState();
                if (!isAuthPage) window.location.href = '/';
                return Promise.reject(error);
            }

            // Guard 2: Don't retry the same request forever
            if (originalRequest._retry) {
                clearClientAuthState();
                if (!isAuthPage) window.location.href = '/';
                return Promise.reject(error);
            }

            // Guard 3: Queue multiple simultaneous 401s
            if (_isRefreshing) {
                return new Promise((resolve, reject) => {
                    _refreshQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            _isRefreshing = true;

            try {
                // Call refresh endpoint. The HttpOnly cookie will be sent automatically
                const response = await axios.post(
                    `${BASE_URL}/api/accounts/auth/refresh/`,
                    {},
                    { withCredentials: true }
                );
                const newToken = response.data.access;
                sessionStorage.setItem('access', newToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                processQueue(null, newToken);
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearClientAuthState();
                if (!isAuthPage) window.location.href = '/';
                return Promise.reject(refreshError);
            } finally {
                _isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default api;