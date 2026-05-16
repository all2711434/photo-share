import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { HiOutlineLogin, HiOutlineUserAdd, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import './Login.css';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const res = await login(formData.username, formData.password);
        if (res.success) {
          navigate('/');
        } else {
          setError(res.message);
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('两次输入的密码不一致');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setError('密码长度不能少于6个字符');
          setLoading(false);
          return;
        }
        const res = await register(formData.username, formData.email, formData.password);
        if (res.success) {
          navigate('/');
        } else {
          setError(res.message);
        }
      }
    } catch (err) {
      setError(err.message || '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* 背景装饰 */}
      <div className="auth-bg-decoration">
        <div className="auth-circle auth-circle-1"></div>
        <div className="auth-circle auth-circle-2"></div>
        <div className="auth-circle auth-circle-3"></div>
      </div>

      <div className="auth-container">
        {/* 标题 */}
        <div className="auth-header">
          <h1 className="auth-title">
            {isLogin ? 'SYSTEM LOGIN' : 'ACCESS REGISTER'}
          </h1>
          <p className="auth-subtitle">
            {isLogin ? '输入凭证以访问系统' : '创建新的访问账户'}
          </p>
          <div className="auth-header-line"></div>
        </div>

        {/* 切换标签 */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            <HiOutlineLogin /> 登录
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            <HiOutlineUserAdd /> 注册
          </button>
          <div className="auth-tab-indicator" style={{ left: isLogin ? '0%' : '50%' }}></div>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="input-group">
            <label>用户名</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="输入用户名..."
              required
              autoComplete="username"
            />
          </div>

          {!isLogin && (
            <div className="input-group">
              <label>邮箱</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="输入邮箱地址..."
                required
                autoComplete="email"
              />
            </div>
          )}

          <div className="input-group">
            <label>密码</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="输入密码..."
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="input-group">
              <label>确认密码</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="再次输入密码..."
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-loading">
                <span className="loading-spinner-sm"></span>
                处理中...
              </span>
            ) : (
              isLogin ? '进 入 系 统' : '创 建 账 户'
            )}
          </button>

          {isLogin && (
            <div className="auth-hint">
              <span className="hint-label">测试账户</span>
              <span className="hint-text">用户名: photographer1 / 密码: 123456</span>
            </div>
          )}
        </form>

        {/* 底部装饰 */}
        <div className="auth-footer-decoration">
          <div className="decoration-line"></div>
          <span className="decoration-text">PHOTOSHARE v1.0</span>
          <div className="decoration-line"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
