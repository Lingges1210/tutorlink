"use client";

import { AnimatePresence, motion } from "framer-motion";

export function LevelUpModal({
  open,
  newLevel,
  onClose,
}: {
  open: boolean;
  newLevel: number;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-[0_40px_120px_rgb(var(--shadow)/0.25)]"
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl">🎉</div>
              <div className="mt-2 text-xl font-bold text-[rgb(var(--fg))]">
                Level Up!
              </div>
              <div className="mt-1 text-sm text-[rgb(var(--muted))]">
                You reached <span className="font-semibold">Level {newLevel}</span>
              </div>

              <button
                className="mt-5 w-full rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white"
                onClick={onClose}
              >
                Let’s go
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}