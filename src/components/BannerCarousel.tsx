import { useState, useEffect } from 'react';
import { useActiveBanners } from '@/hooks/useBanners';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BannerCarousel = () => {
  const { data: banners = [], isLoading, error } = useActiveBanners();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === banners.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  // Reset index if banners change
  useEffect(() => {
    setCurrentIndex(0);
  }, [banners]);

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? banners.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === banners.length - 1 ? 0 : currentIndex + 1);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const handleBannerClick = (banner: any) => {
    if (banner.link_url) {
      // Check if it's an external URL
      if (banner.link_url.startsWith('http://') || banner.link_url.startsWith('https://')) {
        window.open(banner.link_url, '_blank', 'noopener,noreferrer');
      } else {
        // Internal link
        window.location.href = banner.link_url;
      }
    }
  };

  // Don't render if loading or no banners
  if (isLoading || error || banners.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="relative max-w-6xl mx-auto">
          {/* Banner Container */}
          <div className="relative overflow-hidden rounded-xl shadow-lg bg-white">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className="w-full flex-shrink-0 relative"
                >
                  <div
                    className={`relative w-full h-64 md:h-80 lg:h-96 ${
                      banner.link_url ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => handleBannerClick(banner)}
                  >
                    <img
                      src={banner.image_url}
                      alt={`Banner ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                    
                    {/* Overlay for better text readability if needed */}
                    <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                    
                    {/* Click indicator for linked banners */}
                    {banner.link_url && (
                      <div className="absolute top-4 right-4 bg-white bg-opacity-90 px-3 py-1 rounded-full text-xs font-medium text-gray-700">
                        Klik untuk info lebih lanjut
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            {banners.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full shadow-md"
                  onClick={goToPrevious}
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full shadow-md"
                  onClick={goToNext}
                  aria-label="Next banner"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Dots Indicator */}
            {banners.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? 'bg-white shadow-md'
                        : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                    }`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to banner ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Banner Counter */}
          {banners.length > 1 && (
            <div className="text-center mt-4">
              <span className="text-sm text-gray-500">
                {currentIndex + 1} dari {banners.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default BannerCarousel;