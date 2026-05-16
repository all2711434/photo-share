import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { photoAPI, favoriteAPI, likeAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineHeart,
  HiHeart,
  HiOutlineEye,
  HiOutlinePhotograph,
  HiOutlineFire,
  HiOutlineClock,
  HiOutlineTrendingUp
} from 'react-icons/hi';
import './Home.css';
import Carousel from '../../components/Carousel/Carousel';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSort, setActiveSort] = useState('latest');
  const [activeCategory, setActiveCategory] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // 获取分类
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await photoAPI.getCategories();
        if (res.success) setCategories(res.data);
      } catch (e) { /* ignore */ }
    };
    fetchCategories();
  }, []);

  // 获取精选图片
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await photoAPI.getFeatured();
        if (res.success) setFeatured(res.data);
      } catch (e) { /* ignore */ }
    };
    fetchFeatured();
  }, []);

  // 获取图片列表
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        sort: activeSort
      };
      if (activeCategory) params.category = activeCategory;
      if (searchQuery) params.search = searchQuery;

      const res = await photoAPI.getPhotos(params);
      if (res.success) {
        setPhotos(page === 1 ? res.data.photos : [...photos, ...res.data.photos]);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (e) {
      console.error('获取图片失败:', e);
    } finally {
      setLoading(false);
    }
  }, [page, activeSort, activeCategory, searchQuery]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleSortChange = (sort) => {
    setActiveSort(sort);
    setPage(1);
    setPhotos([]);
  };

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId === activeCategory ? null : catId);
    setPage(1);
    setPhotos([]);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setPhotos([]);
    fetchPhotos();
  };

  const handleFavorite = async (e, photoId, isFavorited) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;

    try {
      if (isFavorited) {
        await favoriteAPI.removeFavorite(photoId);
      } else {
        await favoriteAPI.addFavorite(photoId);
      }
      setPhotos(photos.map(p =>
        p.id === photoId ? { ...p, is_favorited: !isFavorited } : p
      ));
    } catch (err) {
      console.error('收藏操作失败:', err);
    }
  };

  const handleLike = async (e, photoId, isLiked) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;

    try {
      if (isLiked) {
        await likeAPI.unlike(photoId);
      } else {
        await likeAPI.like(photoId);
      }
      setPhotos(photos.map(p =>
        p.id === photoId ? { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1 } : p
      ));
    } catch (err) {
      console.error('点赞操作失败:', err);
    }
  };

  const loadMore = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <div className="home-page">
      <div className="page-container">
        {/* Hero Banner */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <HiOutlinePhotograph /> PHOTO SHARE
            </div>
            <h1 className="hero-title">
              探索视觉宇宙
              <span className="hero-title-glow"></span>
            </h1>
            <p className="hero-desc">
              在这里，每一帧光影都是一段星际旅行。发现、分享、收藏来自全球摄影师的精彩作品。
            </p>
            <form className="hero-search" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="搜索摄影作品、标签、摄影师..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">搜索</button>
            </form>
          </div>
          <div className="hero-decoration">
            <div className="hero-hexagon hex-1"></div>
            <div className="hero-hexagon hex-2"></div>
            <div className="hero-hexagon hex-3"></div>
          </div>
        </section>


        {/* 图片轮播 */}
        {featured.length > 0 && (
          <section className="carousel-section">
            <Carousel photos={featured} />
          </section>
        )}
        {/* 精选图片 */}
        {featured.length > 0 && (
          <section className="featured-section">
            <div className="section-header">
              <h2 className="section-title">
                <HiOutlineFire /> 精选推荐
              </h2>
              <div className="section-line"></div>
            </div>
            <div className="featured-grid">
              {featured.slice(0, 4).map((photo, index) => (
                <Link
                  to={`/photo/${photo.id}`}
                  key={photo.id}
                  className={`featured-card featured-card-${index}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="featured-image">
                    <img
                      src={photo.thumbnail_path || photo.file_path}
                      alt={photo.title}
                      loading="lazy"
                    />
                    <div className="featured-overlay">
                      <h3>{photo.title}</h3>
                      <span className="featured-author">@{photo.username}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 分类筛选 */}
        <section className="filter-section">
          <div className="filter-categories">
            <button
              className={`filter-tag ${!activeCategory ? 'active' : ''}`}
              onClick={() => handleCategoryChange(null)}
            >
              全部
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`filter-tag ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="filter-sort">
            <button
              className={`sort-btn ${activeSort === 'latest' ? 'active' : ''}`}
              onClick={() => handleSortChange('latest')}
            >
              <HiOutlineClock /> 最新
            </button>
            <button
              className={`sort-btn ${activeSort === 'popular' ? 'active' : ''}`}
              onClick={() => handleSortChange('popular')}
            >
              <HiOutlineTrendingUp /> 热门
            </button>
            <button
              className={`sort-btn ${activeSort === 'most_liked' ? 'active' : ''}`}
              onClick={() => handleSortChange('most_liked')}
            >
              <HiOutlineHeart /> 最多赞
            </button>
          </div>
        </section>

        {/* 图片瀑布流 */}
        <div className="photo-grid">
          {photos.map((photo, index) => (
            <Link
              to={`/photo/${photo.id}`}
              key={photo.id}
              className="photo-card"
              style={{ animationDelay: `${(index % 10) * 0.05}s` }}
            >
              <div className="photo-image-wrapper">
                <img
                  src={photo.thumbnail_path || photo.file_path}
                  alt={photo.title}
                  loading="lazy"
                />
                <div className="photo-overlay">
                  <div className="photo-actions">
                    <button
                      className={`action-btn ${photo.is_favorited ? 'active' : ''}`}
                      onClick={(e) => handleFavorite(e, photo.id, photo.is_favorited)}
                      title={photo.is_favorited ? '取消收藏' : '收藏'}
                    >
                      {photo.is_favorited ? <HiHeart /> : <HiOutlineHeart />}
                    </button>
                  </div>
                  <div className="photo-info">
                    <h3 className="photo-title">{photo.title}</h3>
                    <div className="photo-meta">
                      <span className="photo-author">@{photo.username}</span>
                      <span className="photo-views">
                        <HiOutlineEye /> {photo.views}
                      </span>
                      <span className="photo-likes">
                        <HiOutlineHeart /> {photo.likes}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {photo.category_name && (
                <span className="photo-category">{photo.category_name}</span>
              )}
            </Link>
          ))}
        </div>

        {/* 加载更多 */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">LOADING</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="empty-state">
            <HiOutlinePhotograph />
            <p>暂无图片，成为第一个分享者吧！</p>
          </div>
        ) : page < totalPages ? (
          <div className="load-more">
            <button className="btn btn-primary" onClick={loadMore}>
              加载更多
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Home;

