/**
 * LingoFriends - Confirm Dialog Component
 * 
 * A kid-friendly confirmation dialog for important actions.
 * Uses Modal component as base with clear Yes/No options.
 * 
 * @module ConfirmDialog
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Modal, Button } from './ui';

// ============================================
// TYPES
// ============================================

export interface ConfirmDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Called when user makes a choice */
  onClose: (confirmed: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Text for confirm button */
  confirmText?: string;
  /** Text for cancel button */
  cancelText?: string;
  /** Variant affects button styling */
  variant?: 'default' | 'warning' | 'danger';
  /** Optional icon to display */
  icon?: string;
}

// ============================================
// COMPONENT
// ============================================

/**
 * ConfirmDialog - Kid-friendly confirmation dialog
 * 
 * @example
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   onClose={(confirmed) => {
 *     if (confirmed) doAction();
 *     setShowConfirm(false);
 *   }}
 *   title="Change subject?"
 *   message="Your current lessons will stay saved."
 *   confirmText="Yes, change it!"
 *   cancelText="Never mind"
 * />
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmText = "Yes!",
  cancelText = "Never mind",
  variant = 'default',
  icon,
}: ConfirmDialogProps) {
  
  // Get button variant based on dialog variant
  const confirmButtonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose(false)}
      size="sm"
      showCloseButton={false}
      closeOnBackdrop={false}
      closeOnEscape={true}
    >
      <div className="text-center py-2">
        {/* Icon */}
        {icon && (
          <motion.div
            className="text-5xl mb-4"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            {icon}
          </motion.div>
        )}

        {/* Title */}
        <motion.h2
          className="text-xl font-bold text-[#262626] mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.h2>

        {/* Message */}
        <motion.p
          className="text-[#737373] mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>

        {/* Buttons */}
        <motion.div
          className="flex gap-3 justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => onClose(false)}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmButtonVariant}
            size="md"
            onClick={() => onClose(true)}
          >
            {confirmText}
          </Button>
        </motion.div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
