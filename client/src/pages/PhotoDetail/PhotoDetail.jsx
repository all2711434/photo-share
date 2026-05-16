import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { photoAPI, favoriteAPI, likeAPI, commentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineHeart,
  HiHeart,
  HiOutlineEye,
  HiOutlineCalendar,
  HiOutlineUser,
  HiOutlineChatAlt,
  HiOutlineTrash,
  HiArrowLeft,
  HiOutlinePhotograph
} from 'react-icons/hi';
import './PhotoDetail.css';

const PhotoDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        const res = await photoAPI.getPhotoDetail(id);
        if (res.success) {
          setPhoto(res.data);
        }
      } catch (e) {
        console.error('获取图片详情失败:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPhoto();
  }, [id]);

  const handleFavorite = async () => {
    if (!isAuthenticated) return;
    try {
      if (photo.is_favorited) {
        await favoriteAPI.removeFavorite(photo.id);
      } else {
        await favoriteAPI.addFavorite(photo.id);
      }
      setPhoto({ ...photo, is_favorited: !photo.is_favorited });
    } catch (e) {
      console.error('收藏操作失败:', e);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) return;
    try {
      if (photo.is_liked) {
        await likeAPI.unlike(photo.id);
        setPhoto({ ...photo, is_liked: false, likes: photo.likes - 1 });
      } else {
        await likeAPI.like(photo.id);
        setPhoto({ ...photo, is_liked: true, likes: photo.likes + 1 });
      }
    } catch (e) {
      console.error('点赞操作失败:', e);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await commentAPI.addComment(photo.id, commentText);
      if (res.success) {
        setPhoto({
          ...photo,
          comments: [res.data, ...photo.comments]
        });
        setCommentText('');
      }
    } catch (e) {
      console.error('评论失败:', e);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    try {
      await commentAPI.deleteComment(commentId);
      setPhoto({
        ...photo,
        comments: photo.comments.filter(c => c.id !== commentId)
      });
    } catch (e) {
      console.error('删除评论失败:', e);
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ paddingTop: '120px' }}>
        <div className="loading-spinner"></div>
        <p className="loading-text">LOADING</p>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="loading-container" style={{ paddingTop: '120px' }}>
        <HiOutlinePhotograph style={{ fontSize: 48, opacity: 0.3 }} />
        <p style={{ color: 'var(--text-muted)' }}>图片不存在或已被删除</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>返回首页</Link>
      </div>
    );
  }

  return (
    <div className="photo-detail-page">
      <div className="page-container">
        {/* 返回按钮 */}
        <Link to="/" className="back-btn">
          <HiArrowLeft /> 返回
        </Link>

        <div className="detail-layout">
          {/* 左侧 - 图片 */}
          <div className="detail-image-section">
            <div className="detail-image-container">
              <img
                src={photo.file_path}
                alt={photo.title}
                className="detail-image"
              />
              <div className="detail-image-overlay-top">
                {photo.category_name && (
                  <span className="detail-category">{photo.category_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* 右侧 - 信息 */}
          <div className="detail-info-section">
            {/* 作者信息 */}
            <Link to={`/profile/${photo.user_id}`} className="detail-author">
              <div className="author-avatar">
                {photo.user_avatar ? (
                  <img src={photo.user_avatar} alt={photo.username} />
                ) : (
                  photo.username?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="author-info">
                <span className="author-name">@{photo.username}</span>
                <span className="author-bio">{photo.user_bio || '摄影师'}</span>
              </div>
            </Link>

            {/* 标题和描述 */}
            <h1 className="detail-title">{photo.title}</h1>
            {photo.description && (
              <p className="detail-description">{photo.description}</p>
            )}

            {/* 标签 */}
            {photo.tags && (
              <div className="detail-tags">
                {photo.tags.split(',').map((tag, i) => (
                  tag.trim() && <span key={i} className="tag">#{tag.trim()}</span>
                ))}
              </div>
            )}

            {/* 统计 */}
            <div className="detail-stats">
              <div className="stat-item">
                <HiOutlineEye /> {photo.views} 浏览
              </div>
              <div className="stat-item">
                <HiOutlineHeart /> {photo.likes} 点赞
              </div>
              <div className="stat-item">
                <HiOutlineCalendar /> {new Date(photo.created_at).toLocaleDateString('zh-CN')}
              </div>
              {photo.width && photo.height && (
                <div className="stat-item">
                  <HiOutlinePhotograph /> {photo.width}×{photo.height}
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="detail-actions">
              <button
                className={`btn ${photo.is_favorited ? 'btn-accent' : 'btn-secondary'}`}
                onClick={handleFavorite}
                disabled={!isAuthenticated}
              >
                {photo.is_favorited ? <HiHeart /> : <HiOutlineHeart />}
                {photo.is_favorited ? '已收藏' : '收藏'}
              </button>
              <button
                className={`btn ${photo.is_liked ? 'btn-accent' : 'btn-primary'}`}
                onClick={handleLike}
                disabled={!isAuthenticated}
              >
                {photo.is_liked ? <HiHeart /> : <HiOutlineHeart />}
                {photo.is_liked ? '已点赞' : '点赞'}
              </button>
            </div>

            {!isAuthenticated && (
              <p className="auth-hint-text">登录后可以收藏和点赞</p>
            )}

            <div className="divider"></div>

            {/* 评论区 */}
            <div className="comments-section">
              <h3 className="comments-title">
                <HiOutlineChatAlt /> 评论 ({photo.comments?.length || 0})
              </h3>

              {isAuthenticated && (
                <form className="comment-form" onSubmit={handleComment}>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="写下你的评论..."
                    rows={3}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={submittingComment || !commentText.trim()}
                  >
                    {submittingComment ? '发送中...' : '发送评论'}
                  </button>
                </form>
              )}

              <div className="comments-list">
                {photo.comments?.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.avatar ? (
                        <img src={comment.avatar} alt={comment.username} />
                      ) : (
                        comment.username?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-user">@{comment.username}</span>
                        <span className="comment-time">
                          {new Date(comment.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <p className="comment-text">{comment.content}</p>
                    </div>
                    {user && (comment.user_id === user.id || user.role === 'admin') && (
                      <button
                        className="comment-delete"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <HiOutlineTrash />
                      </button>
                    )}
                  </div>
                ))}
                {(!photo.comments || photo.comments.length === 0) && (
                  <p className="no-comments">暂无评论，来说点什么吧~</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoDetail;
