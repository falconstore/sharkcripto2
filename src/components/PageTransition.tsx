import { useLocation } from 'react-router-dom';
import { useEffect, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setIsVisible(false);
      const timeout = setTimeout(() => {
        setDisplayLocation(location);
        setIsVisible(true);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [location, displayLocation]);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-3",
        className
      )}
    >
      {children}
    </div>
  );
}
