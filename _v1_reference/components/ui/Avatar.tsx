/**
 * LingoFriends - Avatar Component
 * 
 * User profile avatar with fallback initials.
 * 
 * @module Avatar
 */

import React from 'react';

// ============================================
// TYPES
// ============================================

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /** Image source URL */
  src?: string;
  /** Alt text for image */
  alt?: string;
  /** Fallback name for initials */
  name?: string;
  /** Avatar size */
  size?: AvatarSize;
  /** Show online status indicator */
  showStatus?: boolean;
  /** Online status */
  isOnline?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// STYLES
// ============================================

const sizeStyles: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-14 h-14', text: 'text-lg' },
  xl: { container: 'w-20 h-20', text: 'text-2xl' },
};

const colorPalette = [
  '#58CC02', // primary green
  '#1CB0F6', // secondary blue
  '#FF9600', // accent orange
  '#CE82FF', // purple
  '#FF4B4B', // red
];

// ============================================
// HELPERS
// ============================================

/** Get initials from name */
function getInitials(name: string): string {
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/** Get consistent color based on name */
function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
}

// ============================================
// COMPONENT
// ============================================

/**
 * Avatar - User profile picture with fallback.
 * 
 * @example
 * <Avatar src="/user.jpg" alt="User" />
 * 
 * @example
 * <Avatar name="John Doe" size="lg" showStatus isOnline />
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name = '',
  size = 'md',
  showStatus = false,
  isOnline = false,
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);
  const styles = sizeStyles[size];
  const bgColor = getColorFromName(name || 'User');
  const initials = name ? getInitials(name) : '?';

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`
          ${styles.container}
          rounded-full overflow-hidden
          flex items-center justify-center
          font-bold text-white
        `}
        style={{ backgroundColor: src && !imageError ? 'transparent' : bgColor }}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={styles.text}>{initials}</span>
        )}
      </div>
      
      {/* Online status indicator */}
      {showStatus && (
        <span
          className={`
            absolute bottom-0 right-0
            w-3 h-3 rounded-full
            border-2 border-white
            ${isOnline ? 'bg-[#58CC02]' : 'bg-[#a3a3a3]'}
          `}
        />
      )}
    </div>
  );
};

export default Avatar;
