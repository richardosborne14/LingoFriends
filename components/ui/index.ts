/**
 * LingoFriends - UI Component Library
 * 
 * Barrel export for all UI components.
 * Import from '@/components/ui' for easy access.
 * 
 * @module ui
 */

// Button
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// Card
export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from './Card';
export type { CardProps, CardVariant } from './Card';

// Badge
export { Badge, XPBadge, StreakBadge, LevelBadge } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';

// Input
export { Input } from './Input';
export type { InputProps, InputSize } from './Input';

// ProgressBar
export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps, ProgressVariant, ProgressSize } from './ProgressBar';

// Avatar
export { Avatar } from './Avatar';
export type { AvatarProps, AvatarSize } from './Avatar';

// Modal
export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

// Logo
export { Logo } from './Logo';
export type { LogoProps, LogoSize } from './Logo';
