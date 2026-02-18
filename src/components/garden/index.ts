/**
 * Garden Components
 * 
 * Components for the garden world view - the main home screen
 * where users navigate their skill trees.
 * 
 * @module garden
 */

// Primary 3D garden component
export { GardenWorld3D, useShopCatalogue, useShopCatalogueByCategory, gardenWorldStyles } from './GardenWorld3D';
export type { GardenWorldProps, GardenWorldHandle } from './GardenWorld3D';

// Alias for backwards compatibility
export { GardenWorld3D as GardenWorld } from './GardenWorld3D';

export { GardenTree } from './GardenTree';
export type { GardenTreeProps } from './GardenTree';

export { GardenAvatar } from './GardenAvatar';
export type { GardenAvatarProps } from './GardenAvatar';

export { InteractionPanel } from './InteractionPanel';
export type { InteractionPanelProps } from './InteractionPanel';

export { MobileDpad } from './MobileDpad';
export type { MobileDpadProps } from './MobileDpad';

// Touch D-pad for avatar movement on mobile (Three.js garden)
export { GardenDPad } from './GardenDPad';

// Shop components
export { ShopPanel, shopPanelStyles } from './ShopPanel';
export type { ShopPanelProps } from './ShopPanel';
