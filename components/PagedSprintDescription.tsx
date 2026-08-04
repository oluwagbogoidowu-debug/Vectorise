import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FormattedText from './FormattedText';

interface PagedSprintDescriptionProps {
  text: string;
  className?: string;
  textSizeClass?: string;
}

export const PagedSprintDescription: React.FC<PagedSprintDescriptionProps> = ({
  text,
  className = "",
  textSizeClass = "text-lg sm:text-xl text-gray-800 font-medium leading-relaxed"
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Split description text by line separators (---)
  const slides = useMemo(() => {
    if (!text || !text.trim()) return ["Unlock consistency and start your rise."];
    
    // Split by horizontal rule / separator lines (---)
    const rawParts = text.split(/(?:\r?\n)?\s*---\s*(?:\r?\n)?/g);
    const cleaned = rawParts.map(part => part.trim()).filter(Boolean);
    
    return cleaned.length > 0 ? cleaned : [text.trim()];
  }, [text]);

  // Reset to first slide if text changes or if currentSlide is out of bounds
  React.useEffect(() => {
    setCurrentSlide(0);
  }, [text]);

  const totalSlides = slides.length;

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const deltaX = touchStartXRef.current - e.changedTouches[0].clientX;
    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;

    // Ensure horizontal swipe is dominant and above threshold (35px)
    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        // Swiped left -> Go to next slide
        handleNext();
      } else {
        // Swiped right -> Go to previous slide
        handlePrev();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const currentContent = slides[currentSlide] || slides[0] || "";

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {/* Slide Header / Counter when multiple slides exist */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0E7850] bg-[#0E7850]/10 border border-[#0E7850]/20 px-2.5 py-0.5 rounded-md">
            Slide {currentSlide + 1} of {totalSlides}
          </span>
          {currentSlide < totalSlides - 1 && (
            <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 animate-pulse">
              Swipe left <ChevronRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      )}

      {/* Main Slide Content Area */}
      <div 
        className="relative min-h-[140px] max-h-[38vh] overflow-y-auto custom-scrollbar p-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={textSizeClass}
          >
            <FormattedText text={currentContent} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination & Navigation Controls (Only if > 1 slide) */}
      {totalSlides > 1 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col items-center gap-2">
          {/* Navigation Bar with Dots & Chevrons */}
          <div className="flex items-center justify-between w-full px-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                currentSlide === 0
                  ? 'text-gray-200 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 active:scale-95'
              }`}
              title="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Pagination Dots */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentSlide
                      ? 'w-6 bg-[#0E7850]'
                      : 'w-2 bg-gray-200 hover:bg-gray-300'
                  }`}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentSlide === totalSlides - 1}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                currentSlide === totalSlides - 1
                  ? 'text-gray-200 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 active:scale-95'
              }`}
              title="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Subtitle / Swipe Hint Label */}
          <div className="text-center">
            {currentSlide < totalSlides - 1 ? (
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1">
                Swipe left to see more <ChevronRight className="w-3.5 h-3.5 animate-pulse text-[#0E7850]" />
              </span>
            ) : (
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                End of description
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PagedSprintDescription;
