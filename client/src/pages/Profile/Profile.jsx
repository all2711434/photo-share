import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authAPI, photoAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineUser,
  HiOutlinePhotograph,
  HiOutlineHeart,
  HiOutlineEye,
  HiOutlineCalendar
} from 'react-icons/hi';
import './Profile.css';

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = currentUser && currentUser.id === parseInt(id);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profileRes, photosRes] = await Promise.all([
          authAPI.getUserProfile(id),
          photoAPI.getPhotos({ user_id: id, limit: 50 })
        ]);
        if (profileRes.success) setProfile(profileRes.data);
        if (photosRes.success) setPhotos(photosRes.data.photos);
      } catch (e) {
        console.error('获取用户信息失败:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-container" style={{ paddingTop: '120px' }}>
        <div className="loading-spinner"></div>
        <p className="loading-text">LOADING</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="loading-container" style={{ paddingTop: '120px' }}>
        <p style={{ color: 'var(--text-muted)' }}>用户不存在</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>返回首页</Link>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="page-container">
        {/* 用户信息头部 */}
        <div className="profile-header-section">
          <div className="profile-avatar-large">
            {profile.avatar && !profile.avatar.includes('default') ? (
              <img src={profile.avatar} alt={profile.username} />
            ) : (
              profile.username?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="profile-info">
            <h1 className="profile-username">@{profile.username}</h1>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="stat-value">{profile.stats?.photo_count || 0}</span>
                <span className="stat-label">作品</span>
              </div>
              <div className="profile-stat">
                <span className="stat-value">{profile.stats?.followers_count || 0}</span>
                <span className="stat-label">粉丝</span>
              </div>
              <div className="profile-stat">
                <span className="stat-value">{profile.stats?.following_count || 0}</span>
                <span className="stat-label">关注</span>
              </div>
            </div>
            <div className="profile-meta-info">
              <span><HiOutlineCalendar /> {new Date(profile.created_at).toLocaleDateString('zh-CN')} 加入</span>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* 作品列表 */}
        <div className="page-header">
          <h2><HiOutlinePhotograph /> 作品集</h2>
        </div>

        {photos.length === 0 ? (
          <div className="empty-state">
            <HiOutlinePhotograph />
            <p>暂无作品</p>
          </div>
        ) : (
          <div className="profile-photos-grid">
            {photos.map((photo, index) => (
              <Link
                to={`/photo/${photo.id}`}
                key={photo.id}
                className="profile-photo-card"
                style={{ animationDelay: `${(index % 10) * 0.05}s` }}
              >
                <div className="profile-photo-wrapper">
                  <img
                    src={photo.thumbnail_path || photo.file_path}
                    alt={photo.title}
                    loading="lazy"
                  />
                  <div className="profile-photo-overlay">
                    <div className="profile-photo-stats">
                      <span><HiOutlineEye /> {photo.views}</span>
                      <span><HiOutlineHeart /> {photo.likes}</span>
                    </div>
                  </div>
                </div>
                <div className="profile-photo-info">
                  <h3>{photo.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
