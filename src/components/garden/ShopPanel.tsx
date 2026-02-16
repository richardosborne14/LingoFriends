/**
 * ShopPanel Component
 * 
 * Garden shop overlay for purchasing and placing decorations.
 * Connects the Sun Drop economy to the Three.js garden renderer.
 * 
 * Features:
 * - Category tabs for item filtering
 * - Sun Drop balance display
 * - Item cards with costs
 * - Placement mode with ghost preview
 * - Insufficient funds messaging
 * 
 * @module components/garden/ShopPanel
 * @see docs/phase-1.1/task-1-1-17-garden-shop-ui.md
 */

import React, { useState, useMemo } from 'react';
import { SHOP_CATALOGUE, ShopItem, ObjectCategory } from '../../renderer';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the ShopPanel component.
 */
export interface ShopPanelProps {
  /** Current Sun Drop balance */
  sunDropsBalance: number;
  /** Callback when an item is selected for placement */
  onSelectItem: (item: ShopItem) => void;
  /** Callback when placement is cancelled */
  onCancel: () => void;
  /** Currently selected item (null if none) */
  selectedItem: ShopItem | null;
  /** Whether the shop is open */
  isOpen: boolean;
  /** Callback to close the shop */
  onClose: () => void;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Category display names and icons */
const CATEGORY_INFO: Record<ObjectCategory, { label: string; icon: string }> = {
  Trees: { label: 'Trees', icon: '🌳' },
  Flowers: { label: 'Flowers', icon: '🌸' },
  Plants: { label: 'Plants', icon: '🌿' },
  Furniture: { label: 'Furniture', icon: '🪑' },
  Features: { label: 'Features', icon: '⛲' },
};

/** All categories for the tabs */
const ALL_CATEGORIES: ObjectCategory[] = ['Trees', 'Flowers', 'Plants', 'Furniture', 'Features'];

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * CategoryTabs - Tab bar for filtering items by category.
 */
function CategoryTabs({
  selected,
  onSelect,
}: {
  selected: ObjectCategory | null;
  onSelect: (category: ObjectCategory | null) => void;
}) {
  return (
    <div className="shop-tabs">
      <button
        className={`shop-tab ${selected === null ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {ALL_CATEGORIES.map((category) => (
        <button
          key={category}
          className={`shop-tab ${selected === category ? 'active' : ''}`}
          onClick={() => onSelect(category)}
        >
          {CATEGORY_INFO[category].icon} {CATEGORY_INFO[category].label}
        </button>
      ))}
    </div>
  );
}

/**
 * ShopItemCard - Individual item card in the shop.
 */
function ShopItemCard({
  item,
  canAfford,
  isSelected,
  onSelect,
}: {
  item: ShopItem;
  canAfford: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const cardClass = `shop-item-card ${isSelected ? 'selected' : ''} ${
    !canAfford ? 'disabled' : ''
  }`;

  return (
    <button
      className={cardClass}
      onClick={onSelect}
      disabled={!canAfford}
      title={!canAfford ? `You need ${item.cost} Sun Drops` : item.name}
    >
      <span className="shop-item-icon">{item.icon}</span>
      <span className="shop-item-name">{item.name}</span>
      <span className="shop-item-cost">
        💛 {item.cost}
      </span>
      {!canAfford && (
        <span className="shop-item-locked">🔒</span>
      )}
    </button>
  );
}

/**
 * PlacementModal - Instructions shown during placement mode.
 */
function PlacementModal({
  item,
  onCancel,
}: {
  item: ShopItem;
  onCancel: () => void;
}) {
  return (
    <div className="placement-modal">
      <div className="placement-content">
        <span className="placement-icon">{item.icon}</span>
        <span className="placement-name">{item.name}</span>
        <span className="placement-hint">Click a grass tile to place</span>
        <span className="placement-cost">💛 {item.cost}</span>
        <button
          className="placement-cancel"
          onClick={onCancel}
          aria-label="Cancel placement"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ShopPanel - Garden shop overlay component.
 * 
 * Displays purchasable items organized by category. When an item is selected,
 * the caller enters placement mode and shows a ghost preview in the garden.
 * 
 * @example
 * <ShopPanel
 *   sunDropsBalance={42}
 *   selectedItem={selectedItem}
 *   onSelectItem={handleSelect}
 *   onCancel={handleCancel}
 *   isOpen={showShop}
 *   onClose={() => setShowShop(false)}
 * />
 */
export function ShopPanel({
  sunDropsBalance,
  onSelectItem,
  onCancel,
  selectedItem,
  isOpen,
  onClose,
  className = '',
}: ShopPanelProps) {
  // Selected category filter (null = All)
  const [selectedCategory, setSelectedCategory] = useState<ObjectCategory | null>(null);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (!selectedCategory) return SHOP_CATALOGUE;
    return SHOP_CATALOGUE.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  // Handle item selection
  const handleItemSelect = (item: ShopItem) => {
    if (sunDropsBalance >= item.cost) {
      onSelectItem(item);
    }
  };

  // Don't render if not open
  if (!isOpen) return <></>;

  return (
    <div className={`shop-panel ${className}`}>
      {/* Header with Sun Drop balance */}
      <div className="shop-header">
        <h2 className="shop-title">🌿 Garden Shop</h2>
        <div className="shop-balance">
          <span className="balance-icon">💛</span>
          <span className="balance-amount">{sunDropsBalance}</span>
          <span className="balance-label">Sun Drops</span>
        </div>
        <button
          className="shop-close"
          onClick={onClose}
          aria-label="Close shop"
        >
          ✕
        </button>
      </div>

      {/* Category tabs */}
      <CategoryTabs
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Item grid */}
      <div className="shop-items">
        {filteredItems.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            canAfford={sunDropsBalance >= item.cost}
            isSelected={selectedItem?.id === item.id}
            onSelect={() => handleItemSelect(item)}
          />
        ))}
      </div>

      {/* Footer hint */}
      <div className="shop-footer">
        Complete lessons to earn more Sun Drops ✨
      </div>

      {/* Placement modal overlay */}
      {selectedItem && (
        <PlacementModal
          item={selectedItem}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

/**
 * CSS styles for ShopPanel component.
 * Import these or add to your stylesheet.
 */
export const shopPanelStyles = `
/* Shop Panel Container */
.shop-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  max-width: 90vw;
  height: 100%;
  background: linear-gradient(180deg, #f0fff0 0%, #e8f5e9 100%);
  border-left: 3px solid #4caf50;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 100;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

/* Header */
.shop-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: linear-gradient(180deg, #4caf50 0%, #388e3c 100%);
  color: white;
}

.shop-title {
  flex: 1;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.shop-balance {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 16px;
  margin-right: 12px;
}

.balance-icon {
  font-size: 1rem;
}

.balance-amount {
  font-weight: 700;
  font-size: 1.1rem;
}

.balance-label {
  font-size: 0.75rem;
  opacity: 0.9;
}

.shop-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.shop-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Category Tabs */
.shop-tabs {
  display: flex;
  gap: 4px;
  padding: 8px;
  overflow-x: auto;
  background: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid #e0e0e0;
}

.shop-tab {
  flex-shrink: 0;
  padding: 8px 12px;
  border: none;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #666;
  transition: all 0.2s;
  white-space: nowrap;
}

.shop-tab:hover {
  background: #e8f5e9;
  color: #388e3c;
}

.shop-tab.active {
  background: #4caf50;
  color: white;
}

/* Items Grid */
.shop-items {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
  align-content: start;
}

/* Item Card */
.shop-item-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: white;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.shop-item-card:hover:not(.disabled) {
  background: #f1f8e9;
  border-color: #81c784;
  transform: translateY(-2px);
}

.shop-item-card.selected {
  background: #c8e6c9;
  border-color: #4caf50;
}

.shop-item-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.shop-item-icon {
  font-size: 2rem;
  margin-bottom: 4px;
}

.shop-item-name {
  font-size: 0.75rem;
  color: #333;
  text-align: center;
  line-height: 1.2;
  margin-bottom: 4px;
}

.shop-item-cost {
  font-size: 0.8rem;
  font-weight: 600;
  color: #f9a825;
}

.shop-item-card.disabled .shop-item-cost {
  color: #999;
}

.shop-item-locked {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.75rem;
}

/* Footer */
.shop-footer {
  padding: 12px;
  text-align: center;
  font-size: 0.8rem;
  color: #666;
  background: rgba(0, 0, 0, 0.03);
  border-top: 1px solid #e0e0e0;
}

/* Placement Modal */
.placement-modal {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 110;
}

.placement-content {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 2px solid #4caf50;
}

.placement-icon {
  font-size: 1.5rem;
}

.placement-name {
  font-weight: 600;
  color: #333;
}

.placement-hint {
  font-size: 0.85rem;
  color: #666;
}

.placement-cost {
  font-weight: 600;
  color: #f9a825;
}

.placement-cancel {
  width: 28px;
  height: 28px;
  border: none;
  background: #f44336;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  transition: background 0.2s;
}

.placement-cancel:hover {
  background: #d32f2f;
}

/* Responsive */
@media (max-width: 480px) {
  .shop-panel {
    width: 100%;
    max-width: 100%;
  }

  .shop-item-card {
    padding: 10px 6px;
  }

  .shop-item-icon {
    font-size: 1.5rem;
  }
}
`;

// ============================================================================
// EXPORTS
// ============================================================================

export default ShopPanel;