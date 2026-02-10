"use client";

import { useState } from "react";
import styles from "./LogoutButton.module.css";

type Props = {
  onLogout: () => Promise<void> | void;
};

export default function LogoutButton({ onLogout }: Props) {
  const [animating, setAnimating] = useState(false);

  async function handleClick() {
    if (animating) return;

    setAnimating(true);

    // let animation play first (matches “click then leave” feel)
    setTimeout(async () => {
      await onLogout();
      setAnimating(false);
    }, 900);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${styles.btn} ${animating ? styles.play : ""}`}
      aria-label="Log out"
    >
      <span className={styles.text}>Log Out</span>

      {/* icon scene */}
      <span className={styles.scene} aria-hidden="true">
        {/* door */}
        <span className={styles.door} />
        {/* person */}
        <span className={styles.person} />
      </span>
    </button>
  );
}
