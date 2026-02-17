/**
 * Shop Test Harness
 * 
 * Development component for testing the ShopPanel and garden object placement.
 * Press Ctrl+Shift+P (or Cmd+Shift+P on Mac) to toggle.
 * 
 * Features:
 * - Test ShopPanel UI with mock Gem balance
 * - Test placement mode flow
 * - Test garden object service CRUD operations
 * 
 * @module components/dev/ShopTestHarness
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ShopPanel } from '../garden';
import { useShopCatalogue } from '../garden/GardenWorld3D';
import { gardenObjectService, GardenObject } from '../../services/gardenObjectService';
import type { ShopItem } from '../../renderer';

// ============================================================================
// STYLES
// ============================================================================

const styles = `
.shop-test-harness {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
  padding: 1rem;
}

.shop-test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
}

.shop-test-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #166534;
}

.shop-test-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.shop-test-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.shop-test-btn-primary {
  background: #22c55e;
  color: white;
}

.shop-test-btn-primary:hover {
  background: #16a34a;
}

.shop-test-btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.shop-test-btn-secondary:hover {
  background: #d1d5db;
}

.shop-test-btn-danger {
  background: #ef4444;
  color: white;
}

.shop-test-btn-danger:hover {
  background: #dc2626;
}

.shop-test-content {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1rem;
  height: calc(100vh - 8rem);
}

.shop-test-sidebar {
  background: white;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-y: auto;
}

.shop-test-garden {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
}

.shop-test-section {
  margin-bottom: 1.5rem;
}

.shop-test-section-title {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.shop-test-stat {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.shop-test-stat-label {
  color: #6b7280;
}

.shop-test-stat-value {
  font-weight: 600;
  color: #111827;
}

.shop-test-objects-list {
  max-height: 200px;
  overflow-y: auto;
}

.shop-test-object-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.shop-test-object-remove {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
}

.placement-preview {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 1rem 2rem;
  border-radius: 1rem;
  font-weight: 500;
  z-index: 100;
}

.balance-adjust {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.balance-adjust input {
  width: 80px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}
`.trim();

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Test harness for the ShopPanel component.
 */
export const ShopTestHarness: React.FC = () => {
  // State
  const [gemBalance, setGemBalance] = useState(100);
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [placedObjects, setPlacedObjects] = useState<GardenObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock adjustment input
  const [adjustAmount, setAdjustAmount] = useState('50');

  // Get shop catalogue
  const catalogue = useShopCatalogue();

  // Load placed objects on mount (simulated)
  useEffect(() => {
    // In a real app, this would load from Pocketbase
    // For testing, we just start with an empty garden
    console.log('[ShopTestHarness] Initialized with mock garden');
  }, []);

  /**
   * Handle item selection from shop
   */
  const handleItemSelect = useCallback((item: ShopItem) => {
    if (gemBalance >= item.cost) {
      setSelectedItem(item);
      console.log('[ShopTestHarness] Selected item:', item.name);
    }
  }, [gemBalance]);

  /**
   * Handle placement cancellation
   */
  const handleCancelPlacement = useCallback(() => {
    setSelectedItem(null);
    console.log('[ShopTestHarness] Cancelled placement');
  }, []);

  /**
   * Handle placement confirmation (simulated)
   */
  const handleConfirmPlacement = useCallback(async (gx: number, gz: number) => {
    if (!selectedItem) return;

    setIsLoading(true);
    try {
      // Simulate placing object
      const newObject: GardenObject = {
        id: `obj-${Date.now()}`,
        userId: 'test-user',
        objectId: selectedItem.id,
        gx,
        gz,
        placedAt: new Date().toISOString(),
      };

      // Deduct gem cost
      setGemBalance(prev => prev - selectedItem.cost);
      
      // Add to placed objects
      setPlacedObjects(prev => [...prev, newObject]);
      
      // Clear selection
      setSelectedItem(null);
      
      console.log('[ShopTestHarness] Placed object:', selectedItem.name, 'at', gx, gz);
    } catch (error) {
      console.error('[ShopTestHarness] Failed to place object:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedItem]);

  /**
   * Remove a placed object
   */
  const handleRemoveObject = useCallback((objectId: string) => {
    setPlacedObjects(prev => prev.filter(obj => obj.id !== objectId));
    console.log('[ShopTestHarness] Removed object:', objectId);
  }, []);

  /**
   * Clear all objects
   */
  const handleClearAll = useCallback(() => {
    setPlacedObjects([]);
    console.log('[ShopTestHarness] Cleared all objects');
  }, []);

  /**
   * Adjust balance
   */
  const handleAdjustBalance = useCallback((amount: number) => {
    setGemBalance(prev => Math.max(0, prev + amount));
  }, []);

  /**
   * Reset to defaults
   */
  const handleReset = useCallback(() => {
    setGemBalance(100);
    setPlacedObjects([]);
    setSelectedItem(null);
    setIsShopOpen(true);
    console.log('[ShopTestHarness] Reset to defaults');
  }, []);

  return (
    <div className="shop-test-harness">
      <style>{styles}</style>
      
      {/* Header */}
      <div className="shop-test-header">
        <div>
          <h1 className="shop-test-title">🛒 Shop Test Harness</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Test the ShopPanel component and garden object placement
          </p>
        </div>
        <div className="shop-test-controls">
          <button 
            className="shop-test-btn shop-test-btn-secondary"
            onClick={() => setIsShopOpen(!isShopOpen)}
          >
            {isShopOpen ? 'Hide Shop' : 'Show Shop'}
          </button>
          <button 
            className="shop-test-btn shop-test-btn-secondary"
            onClick={handleClearAll}
          >
            Clear Garden
          </button>
          <button 
            className="shop-test-btn shop-test-btn-danger"
            onClick={handleReset}
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="shop-test-content">
        {/* Sidebar */}
        <div className="shop-test-sidebar">
          {/* Balance Section */}
          <div className="shop-test-section">
            <h3 className="shop-test-section-title">💎 Gem Balance</h3>
            <div className="shop-test-stat">
              <span className="shop-test-stat-label">Current</span>
              <span className="shop-test-stat-value">{gemBalance}</span>
            </div>
            <div className="balance-adjust">
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Amount"
              />
              <button 
                className="shop-test-btn shop-test-btn-primary"
                onClick={() => handleAdjustBalance(parseInt(adjustAmount) || 0)}
              >
                +Add
              </button>
              <button 
                className="shop-test-btn shop-test-btn-secondary"
                onClick={() => handleAdjustBalance(-(parseInt(adjustAmount) || 0))}
              >
                -Sub
              </button>
            </div>
          </div>

          {/* Placement Mode Section */}
          <div className="shop-test-section">
            <h3 className="shop-test-section-title">🎯 Placement Mode</h3>
            {selectedItem ? (
              <div style={{ padding: '0.5rem', background: '#fef3c7', borderRadius: '0.375rem' }}>
                <div style={{ fontWeight: 600 }}>{selectedItem.icon} {selectedItem.name}</div>
                <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Cost: 💎 {selectedItem.cost}
                </div>
                <button 
                  className="shop-test-btn shop-test-btn-secondary"
                  onClick={handleCancelPlacement}
                  style={{ marginTop: '0.5rem', width: '100%' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Select an item from the shop to start placement
              </div>
            )}
          </div>

          {/* Placed Objects Section */}
          <div className="shop-test-section">
            <h3 className="shop-test-section-title">🌳 Placed Objects ({placedObjects.length})</h3>
            {placedObjects.length > 0 ? (
              <div className="shop-test-objects-list">
                {placedObjects.map((obj) => {
                  const item = catalogue.find(i => i.id === obj.objectId);
                  return (
                    <div key={obj.id} className="shop-test-object-item">
                      <span>
                        {item?.icon || '❓'} {item?.name || obj.objectId}
                        <span style={{ color: '#6b7280', marginLeft: '0.25rem' }}>
                          ({obj.gx}, {obj.gz})
                        </span>
                      </span>
                      <button 
                        className="shop-test-object-remove"
                        onClick={() => handleRemoveObject(obj.id)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                No objects placed yet
              </div>
            )}
          </div>

          {/* Quick Placement Grid */}
          <div className="shop-test-section">
            <h3 className="shop-test-section-title">🗺️ Quick Place Grid</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '0.25rem',
              fontSize: '0.75rem'
            }}>
              {Array.from({ length: 16 }).map((_, i) => {
                const gx = i % 4;
                const gz = Math.floor(i / 4);
                const isOccupied = placedObjects.some(o => o.gx === gx && o.gz === gz);
                return (
                  <button
                    key={i}
                    onClick={() => selectedItem && !isOccupied && handleConfirmPlacement(gx, gz)}
                    disabled={!selectedItem || isOccupied}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      background: isOccupied ? '#fecaca' : selectedItem ? '#bbf7d0' : '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      cursor: selectedItem && !isOccupied ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isOccupied ? '🚫' : `${gx},${gz}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shop Panel */}
        <div className="shop-test-garden">
          {isShopOpen ? (
            <ShopPanel
              isOpen={isShopOpen}
              onClose={() => setIsShopOpen(false)}
              gemBalance={gemBalance}
              selectedItem={selectedItem}
              onSelectItem={handleItemSelect}
              onCancel={handleCancelPlacement}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌱</div>
              <p>Garden View Placeholder</p>
              <p style={{ fontSize: '0.875rem' }}>Click "Show Shop" to open the shop panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Placement Preview Modal */}
      {selectedItem && (
        <div className="placement-preview">
          {selectedItem.icon} Click a tile to place {selectedItem.name} (💎 {selectedItem.cost})
        </div>
      )}
    </div>
  );
};

export default ShopTestHarness;