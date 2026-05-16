import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import './Carousel.css';

const Carousel = ({ photos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const totalSlides = photos.length;

  const goToSlide = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const nextSlide = useCallback(() => {
    goToSlide((currentIndex + 1) % totalSlides);
  }, [currentIndex, totalSlides, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentIndex - 1 + totalSlides) % totalSlides);
  }, [currentIndex, totalSlides, goToSlide]);

  // 自动播放
  useEffect(() => {
    if (totalSlides <= 1) return;

    autoPlayRef.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [nextSlide, totalSlides]);

  // 鼠标悬停暂停自动播放
  const pauseAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
  };

  const resumeAutoPlay = () => {
    if (totalSlides <= 1) return;
    autoPlayRef.current = setInterval(() => {
      nextSlide();
    }, 5000);
  };

  // 触摸事件处理
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    pauseAutoPlay();
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    resumeAutoPlay();
  };

  if (!photos || photos.length === 0) return null;

  return (
    <div
      className="carousel"
      onMouseEnter={pauseAutoPlay}
      onMouseLeave={resumeAutoPlay}
    >
      <div className="carousel-viewport">
        <div
          className="carousel-track"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: isTransitioning ? 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {photos.map((photo) => (
            <div className="carousel-slide" key={photo.id}>
              <Link to={`/photo/${photo.id}`} className="carousel-slide-link">
                <div className="carousel-slide-image">
                  <img
                    src={photo.file_path || photo.thumbnail_path}
                    alt={photo.title}
                    loading="lazy"
                  />
                </div>
                <div className="carousel-slide-overlay">
                  <div className="carousel-slide-content">
                    {photo.category_name && (
                      <span className="carousel-category-badge">
                        {photo.category_name}
                      </span>
                    )}
                    <h3 className="carousel-slide-title">{photo.title}</h3>
                    <span className="carousel-slide-author">@{photo.username}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* 左右导航箭头 */}
        {totalSlides > 1 && (
          <>
            <button
              className="carousel-arrow carousel-arrow-left"
              onClick={prevSlide}
              aria-label="上一张"
            >
              <HiChevronLeft />
            </button>
            <button
              className="carousel-arrow carousel-arrow-right"
              onClick={nextSlide}
              aria-label="下一张"
            >
              <HiChevronRight />
            </button>
          </>
        )}
      </div>

      {/* 底部发光边框 */}
      <div className="carousel-glow-border"></div>

      {/* 圆点指示器 */}
      {totalSlides > 1 && (
        <div className="carousel-dots">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`跳转到第 ${index + 1} 张图片`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Carousel;
