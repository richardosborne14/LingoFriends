/**
 * WorldMapView - World Map Prototype (Task 2.0.11)
 *
 * A static "coming soon" teaser for the multiplayer world feature.
 * Shows the user's garden as an active tile and placeholder friend
 * gardens as locked/foggy tiles with "Coming soon" labels.
 *
 * Features:
 * - User's garden tile (active, clickable)
 * - Placeholder friend tiles (locked, "Coming soon")
 * - Feature preview cards for upcoming multiplayer features
 * - Globe icon access from garden
 *
 * @module components/world/WorldMapView
 * @see docs/phase-2-world-expansion/task-2.0-11-world-map-prototype.md
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../../services/i18n';

// ============================================================================
// TYPES
// ============================================================================

/**
 * User's garden data for display on the world map.
 */
export interface UserGardenInfo {
  /** User's display name */
  name: string;
  /** User's avatar emoji (simple string for display) */
  avatar: string;
  /** Number of trees planted */
  treesPlanted: number;
  /** User's current level */
  level: number;
}

/**
 * Feature preview card for upcoming multiplayer features.
 */
export interface FeaturePreview {
  /** Icon/emoji for the feature */
  icon: string;
  /** Feature title translation key */
  titleKey: string;
  /** Feature description translation key */
  descriptionKey: string;
}

/**
 * Props for WorldMapView component.
 */
export interface WorldMapViewProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** User's garden info */
  userGarden: UserGardenInfo;
  /** Server/world name */
  serverName?: string;
  /** Called when modal is closed */
  onClose: () => void;
  /** Called when user taps their own garden tile */
  onReturnToGarden?: () => void;
}

// ============================================================================
// FEATURE PREVIEWS
// ============================================================================

/**
 * Upcoming multiplayer features to display as teaser cards.
 */
const UPCOMING_FEATURES: FeaturePreview[] = [
  {
    icon: '🌐',
    titleKey: 'worldMap.inviteFriends',
    descriptionKey: 'worldMap.inviteFriendsDesc',
  },
  {
    icon: '🎤',
    titleKey: 'worldMap.voiceChat',
    descriptionKey: 'worldMap.voiceChatDesc',
  },
  {
    icon: '👀',
    titleKey: 'worldMap.watchFriends',
    descriptionKey: 'worldMap.watchFriendsDesc',
  },
];

// ============================================================================
// PLACEHOLDER FRIENDS
// ============================================================================

/**
 * Placeholder friend names for locked tiles.
 */
const PLACEHOLDER_FRIENDS = [
  { name: 'Friend 1', emoji: '🌸' },
  { name: 'Friend 2', emoji: '🌳' },
  { name: 'Friend 3', emoji: '🌻' },
  { name: 'Friend 4', emoji: '🏡' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * User's garden tile - the only active/interactable tile.
 */
const UserGardenTile: React.FC<{
  garden: UserGardenInfo;
  onClick?: () => void;
}> = ({ garden, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="world-map-tile user-garden-tile"
    style={{
      background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
      border: '3px solid #16a34a',
      borderRadius: '16px',
      padding: '16px',
      cursor: onClick ? 'pointer' : 'default',
      minWidth: '140px',
      minHeight: '160px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
    }}
  >
    {/* Mini avatar representation - show emoji directly */}
    <div
      className="garden-avatar-mini"
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
      }}
    >
      {garden.avatar}
    </div>

    {/* Garden name */}
    <div
      className="garden-name"
      style={{
        fontWeight: 'bold',
        fontSize: '14px',
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        maxWidth: '120px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {garden.name}'s Garden
    </div>

    {/* Stats */}
    <div
      className="garden-stats"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: '#f0fdf4',
      }}
    >
      <div>
        ⭐ {t('worldMap.level', { level: garden.level })}
      </div>
      <div>
        🌳 {t('worldMap.treesPlanted', { count: garden.treesPlanted })}
      </div>
    </div>

    {/* "Your Garden" indicator */}
    <div
      style={{
        background: 'rgba(255,255,255,0.9)',
        color: '#16a34a',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
      }}
    >
      {t('worldMap.yourGarden')}
    </div>
  </motion.button>
);

/**
 * Locked friend tile with "Coming soon" indicator.
 */
const LockedFriendTile: React.FC<{
  name: string;
  emoji: string;
}> = ({ name, emoji }) => (
  <motion.div
    className="world-map-tile friend-tile locked"
    style={{
      background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
      border: '2px dashed #94a3b8',
      borderRadius: '16px',
      padding: '16px',
      minWidth: '120px',
      minHeight: '140px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      opacity: 0.8,
    }}
  >
    {/* Lock icon */}
    <div style={{ fontSize: '32px' }}>🔒</div>

    {/* Placeholder emoji */}
    <div style={{ fontSize: '24px', opacity: 0.5 }}>{emoji}</div>

    {/* "Coming soon" label */}
    <div
      style={{
        color: '#e2e8f0',
        fontSize: '12px',
        fontWeight: 'bold',
        textAlign: 'center',
      }}
    >
      {t('worldMap.comingSoon')}
    </div>
  </motion.div>
);

/**
 * Feature preview card for upcoming functionality.
 */
const FeatureCard: React.FC<{
  feature: FeaturePreview;
}> = ({ feature }) => (
  <motion.div
    className="feature-card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}
  >
    {/* Icon */}
    <div
      style={{
        fontSize: '28px',
        flexShrink: 0,
      }}
    >
      {feature.icon}
    </div>

    {/* Text content */}
    <div>
      <div
        style={{
          fontWeight: 'bold',
          fontSize: '14px',
          color: '#1e293b',
          marginBottom: '4px',
        }}
      >
        {t(feature.titleKey)}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#64748b',
          lineHeight: 1.4,
        }}
      >
        {t(feature.descriptionKey)}
      </div>
    </div>
  </motion.div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * WorldMapView - World Map Prototype
 *
 * Displays a 2D map view showing:
 * - User's garden as an active, clickable tile
 * - Placeholder friend gardens (locked, "Coming soon")
 * - Feature preview cards for upcoming multiplayer features
 *
 * @example
 * <WorldMapView
 *   visible={showWorldMap}
 *   userGarden={{ name: 'Alex', avatar: DEFAULT_AVATAR, treesPlanted: 3, level: 5 }}
 *   onClose={() => setShowWorldMap(false)}
 *   onReturnToGarden={() => setShowWorldMap(false)}
 * />
 */
export const WorldMapView: React.FC<WorldMapViewProps> = ({
  visible,
  userGarden,
  serverName = 'LingoFriends World',
  onClose,
  onReturnToGarden,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="world-map-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={(e) => {
            // Close when clicking backdrop
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            className="world-map-container"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header */}
            <div
              className="world-map-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#f8fafc',
                  }}
                >
                  🌍 {serverName}
                </h2>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '12px',
                    color: '#94a3b8',
                  }}
                >
                  {t('worldMap.subtitle')}
                </p>
              </div>

              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
                aria-label={t('a11y.close')}
              >
                ✕
              </motion.button>
            </div>

            {/* Garden tiles grid */}
            <div
              className="world-map-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {/* User's garden */}
              <UserGardenTile
                garden={userGarden}
                onClick={onReturnToGarden}
              />

              {/* Locked friend placeholders */}
              {PLACEHOLDER_FRIENDS.map((friend, index) => (
                <LockedFriendTile
                  key={index}
                  name={friend.name}
                  emoji={friend.emoji}
                />
              ))}
            </div>

            {/* Feature preview cards */}
            <div
              className="feature-cards"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {t('worldMap.comingFeatures')}
              </h3>

              {UPCOMING_FEATURES.map((feature, index) => (
                <FeatureCard key={index} feature={feature} />
              ))}
            </div>

            {/* Footer hint */}
            <div
              style={{
                marginTop: '20px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '11px',
              }}
            >
              {t('worldMap.footerHint')}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WorldMapView;