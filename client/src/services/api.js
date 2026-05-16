import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 自动添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(data);
    }
    return Promise.reject({ message: '网络连接失败，请检查网络设置' });
  }
);

// ==================== 认证API ====================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (formData) => api.put('/auth/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getUserProfile: (id) => api.get(`/auth/${id}`)
};

// ==================== 图片API ====================
export const photoAPI = {
  getPhotos: (params) => api.get('/photos', { params }),
  getFeatured: () => api.get('/photos/featured'),
  getPhotoDetail: (id) => api.get(`/photos/${id}`),
  uploadPhoto: (formData) => api.post('/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deletePhoto: (id) => api.delete(`/photos/${id}`),
  getCategories: () => api.get('/photos/categories/list')
};

// ==================== 收藏API ====================
export const favoriteAPI = {
  getFavorites: (params) => api.get('/favorites', { params }),
  addFavorite: (photoId) => api.post(`/favorites/${photoId}`),
  removeFavorite: (photoId) => api.delete(`/favorites/${photoId}`),
  checkFavorite: (photoId) => api.get(`/favorites/check/${photoId}`)
};

// ==================== 点赞API ====================
export const likeAPI = {
  like: (photoId) => api.post(`/likes/${photoId}`),
  unlike: (photoId) => api.delete(`/likes/${photoId}`)
};

// ==================== 评论API ====================
export const commentAPI = {
  addComment: (photoId, content) => api.post(`/comments/${photoId}`, { content }),
  deleteComment: (commentId) => api.delete(`/comments/${commentId}`)
};

export default api;
