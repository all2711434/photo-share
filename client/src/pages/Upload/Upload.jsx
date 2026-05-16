import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { photoAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineUpload,
  HiOutlinePhotograph,
  HiOutlineTag
} from 'react-icons/hi';
import './Upload.css';

const Upload = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    tags: ''
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const fetchCategories = async () => {
      try {
        const res = await photoAPI.getCategories();
        if (res.success) setCategories(res.data);
      } catch (e) { /* ignore */ }
    };
    fetchCategories();
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过10MB');
        return;
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setError('');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith('image/')) {
      if (dropped.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过10MB');
        return;
      }
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('请选择要上传的图片');
      return;
    }
    if (!formData.title.trim()) {
      setError('请输入图片标题');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('photo', file);
      data.append('title', formData.title);
      data.append('description', formData.description);
      if (formData.category_id) data.append('category_id', formData.category_id);
      if (formData.tags) data.append('tags', formData.tags);

      const res = await photoAPI.uploadPhoto(data);
      if (res.success) {
        navigate(`/photo/${res.data.id}`);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message || '上传失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="upload-page">
      <div className="page-container">
        <div className="page-header">
          <h1><HiOutlineUpload /> UPLOAD</h1>
          <p>分享你的摄影作品到视觉宇宙</p>
        </div>

        <div className="upload-layout">
          {/* 拖拽上传区域 */}
          <div className="upload-dropzone-container">
            <div
              className={`upload-dropzone ${dragActive ? 'active' : ''} ${preview ? 'has-preview' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              {preview ? (
                <div className="dropzone-preview">
                  <img src={preview} alt="预览" />
                  <div className="preview-overlay">
                    <span>点击更换图片</span>
                  </div>
                </div>
              ) : (
                <div className="dropzone-content">
                  <HiOutlineUpload className="dropzone-icon" />
                  <p className="dropzone-title">拖拽图片到此处或点击上传</p>
                  <p className="dropzone-hint">支持 JPEG、PNG、GIF、WebP 格式，最大 10MB</p>
                </div>
              )}
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                hidden
              />
            </div>
          </div>

          {/* 表单区域 */}
          <form className="upload-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error">
                <span className="error-icon">⚠</span>
                {error}
              </div>
            )}

            <div className="input-group">
              <label>作品标题 *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="为你的作品起个名字..."
                required
              />
            </div>

            <div className="input-group">
              <label>作品描述</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="描述一下这张照片的故事..."
                rows={4}
              />
            </div>

            <div className="input-group">
              <label>分类</label>
              <select name="category_id" value={formData.category_id} onChange={handleChange}>
                <option value="">选择分类...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>
                <HiOutlineTag style={{ display: 'inline', verticalAlign: 'middle' }} /> 标签
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="用逗号分隔标签，如: 风景, 日落, 山脉"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg upload-submit"
              disabled={loading}
            >
              {loading ? (
                <span className="auth-loading">
                  <span className="loading-spinner-sm"></span>
                  上传中...
                </span>
              ) : (
                <>
                  <HiOutlineUpload /> 发布作品
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Upload;
