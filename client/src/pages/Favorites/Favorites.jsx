import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { favoriteAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineHeart,
  HiHeart,
  HiOutlineEye,
  HiOutlinePhotograph,
  HiOutlineTrash
} from 'react-icons/hi';
import './Favorites.css';

const Favorites = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const res = await favoriteAPI.getFavorites({ page, limit: 20 });
        if (res.success) {
          setFavorites(page === 1 ? res.data.favorites : [...favorites, ...res.data.favorites]);
          setTotalPages(res.data.pagination.totalPages);
        }
      } catch (e) {
        console.error('获取收藏列表失败:', e);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) fetchFavorites();
  }, [isAuthenticated, page]);

  const handleUnfavorite = async (e, photoId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await favoriteAPI.removeFavorite(photoId);
      setFavorites(favorites.filter(f => f.photo_id !== photoId));
    } catch (err) {
      console.error('取消收藏失败:', err);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="favorites-page">
      <div className="page-container">
        <div className="page-header">
          <h1><HiOutlineHeart /> MY FAVORITES</h1>
          <p>你收藏的所有精彩作品</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">LOADING</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="empty-state">
            <HiOutlineHeart />
            <h3>还没有收藏任何作品</h3>
            <p>浏览图片并点击爱心按钮来收藏喜欢的作品</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>去探索</Link>
          </div>
        ) : (
          <>
            <div className="favorites-grid">
              {favorites.map((fav, index) => (
                <Link
                  to={`/photo/${fav.photo_id}`}
                  key={fav.favorite_id}
                  className="favorite-card"
                  style={{ animationDelay: `${(index % 10) * 0.05}s` }}
                >
                  <div className="favorite-image-wrapper">
                    <img
                      src={fav.thumbnail_path || fav.file_path}
                      alt={fav.title}
                      loading="lazy"
                    />
                    <div className="favorite-overlay">
                      <button
                        className="unfavorite-btn"
                        onClick={(e) => handleUnfavorite(e, fav.photo_id)}
                        title="取消收藏"
                      >
                        <HiOutlineTrash /> 取消收藏
                      </button>
                    </div>
                  </div>
                  <div className="favorite-info">
                    <h3>{fav.title}</h3>
                    <div className="favorite-meta">
                      <span>@{fav.username}</span>
                      <span><HiOutlineEye /> {fav.views}</span>
                      <span><HiOutlineHeart /> {fav.likes}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {page < totalPages && (
              <div className="load-more">
                <button className="btn btn-primary" onClick={() => setPage(page + 1)}>
                  加载更多
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Favorites;
