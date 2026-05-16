import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { photoAPI } from '../../services/api';
import {
  HiOutlinePhotograph,
  HiOutlineHeart,
  HiOutlineEye,
  HiOutlineSearch
} from 'react-icons/hi';
import './Explore.css';

const Explore = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('popular');

  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      try {
        const res = await photoAPI.getPhotos({ page: 1, limit: 40, sort });
        if (res.success) setPhotos(res.data.photos);
      } catch (e) {
        console.error('获取图片失败:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, [sort]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await photoAPI.getPhotos({ search: searchQuery, limit: 40 });
      if (res.success) setPhotos(res.data.photos);
    } catch (e) {
      console.error('搜索失败:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="explore-page">
      <div className="page-container">
        <div className="page-header">
          <h1><HiOutlineSearch /> EXPLORE</h1>
          <p>探索来自全球摄影师的精彩作品</p>
        </div>

        {/* 搜索和排序 */}
        <div className="explore-toolbar">
          <form className="explore-search" onSubmit={handleSearch}>
            <HiOutlineSearch className="search-icon" />
            <input
              type="text"
              placeholder="搜索作品、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <div className="explore-sort">
            <button
              className={sort === 'popular' ? 'active' : ''}
              onClick={() => setSort('popular')}
            >
              最热门
            </button>
            <button
              className={sort === 'latest' ? 'active' : ''}
              onClick={() => setSort('latest')}
            >
              最新
            </button>
            <button
              className={sort === 'most_liked' ? 'active' : ''}
              onClick={() => setSort('most_liked')}
            >
              最多赞
            </button>
          </div>
        </div>

        {/* 瀑布流 */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">LOADING</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="empty-state">
            <HiOutlinePhotograph />
            <p>暂无匹配的作品</p>
          </div>
        ) : (
          <div className="explore-masonry">
            {photos.map((photo, index) => (
              <Link
                to={`/photo/${photo.id}`}
                key={photo.id}
                className="explore-card"
                style={{ animationDelay: `${(index % 12) * 0.04}s` }}
              >
                <div className="explore-card-image">
                  <img
                    src={photo.thumbnail_path || photo.file_path}
                    alt={photo.title}
                    loading="lazy"
                  />
                  <div className="explore-card-overlay">
                    <h3>{photo.title}</h3>
                    <div className="explore-card-meta">
                      <span>@{photo.username}</span>
                      <span><HiOutlineEye /> {photo.views}</span>
                      <span><HiOutlineHeart /> {photo.likes}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
