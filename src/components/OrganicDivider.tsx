import React from 'react';

interface OrganicDividerProps {
  topColor?: string; // background color of upper segment
  bottomColor?: string; // background color of lower segment
  pillColor?: string; // color of organic floating pill cutouts
  inverted?: boolean;
  className?: string;
  showPills?: boolean;
  variant?: 'wavy' | 'notched' | 'smooth';
}

/**
 * OrganicDivider
 * Renders the signature organic fluid notch / puzzle cutout divider
 * inspired by Treats & modern editorial fintech designs.
 */
export const OrganicDivider: React.FC<OrganicDividerProps> = ({
  topColor = 'transparent',
  bottomColor = '#B8B2FF',
  pillColor = '#121118',
  inverted = false,
  className = '',
  showPills = true,
  variant = 'notched',
}) => {
  const upper = inverted ? bottomColor : topColor;
  const lower = inverted ? topColor : bottomColor;

  return (
    <div className={`relative w-full overflow-hidden leading-none select-none ${className}`}>
      <div 
        className="w-full h-11 relative flex items-center justify-between transition-colors duration-300"
        style={{ backgroundColor: upper }}
      >
        {/* Organic wavy silhouette path with soft Bezier interlocking lobes */}
        <svg 
          viewBox="0 0 600 48" 
          preserveAspectRatio="none" 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ color: lower }}
        >
          {variant === 'notched' ? (
            <path 
              d="M 0,48 
                 L 0,22 
                 C 25,22 35,42 65,42 
                 C 95,42 105,16 135,16 
                 C 165,16 175,38 205,38 
                 C 235,38 245,18 275,18 
                 C 305,18 315,40 345,40 
                 C 375,40 385,16 415,16 
                 C 445,16 455,38 485,38 
                 C 515,38 525,20 555,20 
                 C 575,20 585,28 600,28 
                 L 600,48 Z" 
              fill="currentColor"
            />
          ) : (
            <path 
              d="M 0,48 
                 L 0,24 
                 Q 75,44 150,24 
                 T 300,24 
                 T 450,24 
                 T 600,24 
                 L 600,48 Z" 
              fill="currentColor"
            />
          )}
        </svg>

        {/* Floating rounded pill cutouts with soft tactile depth */}
        {showPills && (
          <div className="absolute inset-x-0 top-2.5 flex items-center justify-around px-6 pointer-events-none z-10 opacity-90">
            <div 
              className="w-9 h-3.5 rounded-full shadow-xs transition-colors" 
              style={{ backgroundColor: pillColor }} 
            />
            <div 
              className="w-7 h-3 rounded-full shadow-xs opacity-80 transition-colors" 
              style={{ backgroundColor: pillColor }} 
            />
            <div 
              className="w-11 h-3.5 rounded-full shadow-xs transition-colors" 
              style={{ backgroundColor: pillColor }} 
            />
            <div 
              className="w-8 h-3 rounded-full shadow-xs hidden sm:block opacity-85 transition-colors" 
              style={{ backgroundColor: pillColor }} 
            />
            <div 
              className="w-10 h-3.5 rounded-full shadow-xs hidden md:block transition-colors" 
              style={{ backgroundColor: pillColor }} 
            />
          </div>
        )}
      </div>
    </div>
  );
};
