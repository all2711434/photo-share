import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineCamera,
  HiOutlineHome,
  HiOutlineHeart,
  HiOutlineUpload,
  HiOutlineUser,
  HiOutlineLogin,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX
} from 'react-icons/hi';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { path: '/', label: '首页', icon: <HiOutlineHome /> },
    { path: '/explore', label: '探索', icon: <HiOutlineCamera /> },
  ];

  const authLinks = isAuthenticated ? [
    { path: '/upload', label: '上传', icon: <HiOutlineUpload /> },
    { path: '/favorites', label: '收藏', icon: <HiOutlineHeart /> },
    { path: `/profile/${user?.id}`, label: '我的', icon: <HiOutlineUser /> },
  ] : [
    { path: '/login', label: '登录', icon: <HiOutlineLogin /> },
  ];

  const allLinks = [...navLinks, ...authLinks];

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <HiOutlineCamera />
          </div>
          <div className="logo-text">
            <span className="logo-main">PHOTO</span>
            <span className="logo-sub">SHARE</span>
          </div>
          <div className="logo-decoration"></div>
        </Link>

        {/* 导航链接 */}
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {allLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
              {location.pathname === link.path && <span className="nav-indicator"></span>}
            </Link>
          ))}

          {isAuthenticated && (
            <button className="nav-link logout-btn" onClick={handleLogout}>
              <span className="nav-icon"><HiOutlineLogout /></span>
              <span className="nav-label">退出</span>
            </button>
          )}
        </div>

        {/* 用户信息 */}
        {isAuthenticated && (
          <div className="navbar-user">
            <div className="user-avatar-ring">
              <div className="user-avatar">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            </div>
            <span className="user-name">{user?.username}</span>
          </div>
        )}

        {/* 移动端菜单按钮 */}
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <HiOutlineX /> : <HiOutlineMenu />}
        </button>
      </div>

      {/* 底部扫描线 */}
      <div className="navbar-scanline"></div>
    </nav>
  );
};

export default Navbar;
