import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Explore from './pages/Explore/Explore';
import Upload from './pages/Upload/Upload';
import PhotoDetail from './pages/PhotoDetail/PhotoDetail';
import Favorites from './pages/Favorites/Favorites';
import Profile from './pages/Profile/Profile';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner"></div>
        <p className="loading-text">INITIALIZING SYSTEM</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/photo/:id" element={<PhotoDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile/:id" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
