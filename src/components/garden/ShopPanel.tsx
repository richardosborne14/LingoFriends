/**
 * ShopPanel Component
 * 
 * Garden shop overlay for purchasing and placing decorations.
 * Connects the Gem economy to the Three.js garden renderer.
 * 
 * Features:
 * - Category tabs for item filtering
 * - Gem balance display (💎)
 * - Item cards with gem costs
 * - Placement mode with ghost preview
 * - Insufficient funds messaging
 * 
 * Currency model: Shop uses Gems (global currency), NOT SunDrops.
 * SunDrops are per-tree learning progress and aren't spent in the shop.
 * 
 * @module components/garden/ShopPanel
 * @see docs/FIX-STEPS/step-4-currency-fix.md
 */

import React, { useState, useMemo } from 'react';
import { SHOP_CATALOGUE, ShopItem, ObjectCategory } from '../../renderer';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Learning tree data for tree care items.
 */
export interface LearningTreeData {
  id: string;
  name: string;
  icon: string;
  health: number;
  skillPathId: string;
}

/**
 * Props for the ShopPanel component.
 */
export interface ShopPanelProps {
  /** Current Gem balance (global shop currency) */
  gemBalance: number;
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
  /** User's learning trees for tree care items (optional) */
  userTrees?: LearningTreeData[];
  /** Callback when a tree care item is applied to a learning tree */
  onApplyTreeCare?: (item: ShopItem, treeId: string) => void;
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
  TreeCare: { label: 'Tree Care', icon: '💧' },
};

/** All categories for the tabs */
const ALL_CATEGORIES: ObjectCategory[] = ['Trees', 'Flowers', 'Plants', 'Furniture', 'Features', 'TreeCare'];

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
      title={!canAfford ? `You need ${item.cost} Gems` : item.name}
    >
      <span className="shop-item-icon">{item.icon}</span>
      <span className="shop-item-name">{item.name}</span>
      <span className="shop-item-cost">
        💎 {item.cost}
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
        <span className="placement-cost">💎 {item.cost}</span>
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

/**
 * TreePickerModal - Select which learning tree to apply tree care item to.
 */
function TreePickerModal({
  item,
  trees,
  onSelectTree,
  onCancel,
}: {
  item: ShopItem;
  trees: LearningTreeData[];
  onSelectTree: (treeId: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="tree-picker-overlay">
      <div className="tree-picker-modal">
        <div className="tree-picker-header">
          <h3>{item.icon} {item.name}</h3>
          <p>{item.description}</p>
          <p className="tree-picker-cost">Cost: 💎 {item.cost}</p>
        </div>
        
        <div className="tree-picker-body">
          <p className="tree-picker-prompt">Choose a learning tree:</p>
          {trees.length === 0 ? (
            <div className="tree-picker-empty">
              <p>🌱 No learning trees yet!</p>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>
                Plant a seed to start your first skill path.
              </p>
            </div>
          ) : (
            <div className="tree-picker-list">
              {trees.map((tree) => (
                <button
                  key={tree.id}
                  className="tree-picker-item"
                  onClick={() => onSelectTree(tree.id)}
                >
                  <span className="tree-icon">{tree.icon}</span>
                  <div className="tree-info">
                    <span className="tree-name">{tree.name}</span>
                    <div className="tree-health-bar">
                      <div 
                        className="tree-health-fill"
                        style={{ 
                          width: `${tree.health}%`,
                          backgroundColor: tree.health > 50 ? '#4caf50' : tree.health > 20 ? '#ff9800' : '#f44336'
                        }}
                      />
                    </div>
                    <span className="tree-health-text">{tree.health}% health</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="tree-picker-footer">
          <button className="tree-picker-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
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
 *   gemBalance={42}
 *   selectedItem={selectedItem}
 *   onSelectItem={handleSelect}
 *   onCancel={handleCancel}
 *   isOpen={showShop}
 *   onClose={() => setShowShop(false)}
 * />
 */
export function ShopPanel({
  gemBalance,
  onSelectItem,
  onCancel,
  selectedItem,
  isOpen,
  onClose,
  className = '',
  userTrees = [],
  onApplyTreeCare,
}: ShopPanelProps) {
  // Selected category filter (null = All)
  const [selectedCategory, setSelectedCategory] = useState<ObjectCategory | null>(null);
  // Tree care item awaiting tree selection
  const [treeCareItem, setTreeCareItem] = useState<ShopItem | null>(null);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (!selectedCategory) return SHOP_CATALOGUE;
    return SHOP_CATALOGUE.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  // Handle item selection — checks gem balance and item type
  const handleItemSelect = (item: ShopItem) => {
    if (gemBalance < item.cost) return;
    
    // Tree care items show tree picker instead of placement mode
    if (item.consumable) {
      setTreeCareItem(item);
    } else {
      // Regular items enter placement mode
      onSelectItem(item);
    }
  };

  // Handle tree selection for tree care items
  const handleTreeSelection = (treeId: string) => {
    if (treeCareItem && onApplyTreeCare) {
      onApplyTreeCare(treeCareItem, treeId);
      setTreeCareItem(null);
    }
  };

  // Handle cancel tree care
  const handleCancelTreeCare = () => {
    setTreeCareItem(null);
  };

  // Don't render if not open
  if (!isOpen) return <></>;

  return (
    <div className={`shop-panel ${className}`}>
      {/* Header with Gem balance */}
      <div className="shop-header">
        <h2 className="shop-title">🌿 Garden Shop</h2>
        <div className="shop-balance">
          <span className="balance-icon">💎</span>
          <span className="balance-amount">{gemBalance}</span>
          <span className="balance-label">Gems</span>
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
            canAfford={gemBalance >= item.cost}
            isSelected={selectedItem?.id === item.id}
            onSelect={() => handleItemSelect(item)}
          />
        ))}
      </div>

      {/* Footer hint */}
      <div className="shop-footer">
        Earn 💎 gems by completing lessons! ✨
      </div>

      {/* Placement modal overlay */}
      {selectedItem && !selectedItem.consumable && (
        <PlacementModal
          item={selectedItem}
          onCancel={onCancel}
        />
      )}

      {/* Tree picker modal for tree care items */}
      {treeCareItem && (
        <TreePickerModal
          item={treeCareItem}
          trees={userTrees}
          onSelectTree={handleTreeSelection}
          onCancel={handleCancelTreeCare}
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
  color: #7C3AED;
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
  color: #7C3AED;
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

/* Tree Picker Modal */
.tree-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.tree-picker-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.tree-picker-header {
  padding: 20px;
  border-bottom: 2px solid #e0e0e0;
  text-align: center;
}

.tree-picker-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  color: #333;
}

.tree-picker-header p {
  margin: 4px 0;
  color: #666;
  font-size: 0.9rem;
}

.tree-picker-cost {
  font-weight: 600;
  color: #7C3AED !important;
  font-size: 1rem !important;
}

.tree-picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.tree-picker-prompt {
  margin: 0 0 12px 0;
  font-weight: 600;
  color: #333;
}

.tree-picker-empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.tree-picker-empty p:first-child {
  font-size: 2rem;
  margin: 0 0 8px 0;
}

.tree-picker-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tree-picker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.tree-picker-item:hover {
  background: #f1f8e9;
  border-color: #4caf50;
  transform: translateX(4px);
}

.tree-picker-item .tree-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.tree-picker-item .tree-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tree-picker-item .tree-name {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.tree-health-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.tree-health-fill {
  height: 100%;
  transition: width 0.3s, background-color 0.3s;
}

.tree-health-text {
  font-size: 0.75rem;
  color: #666;
}

.tree-picker-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: center;
}

.tree-picker-cancel {
  padding: 10px 24px;
  border: none;
  background: #e0e0e0;
  color: #666;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.tree-picker-cancel:hover {
  background: #d0d0d0;
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

  .tree-picker-modal {
    width: 95%;
    max-height: 90vh;
  }
}
`;

// ============================================================================
// EXPORTS
// ============================================================================

export default ShopPanel;