"use client";

import { ReactNode, useCallback, useState } from "react";
import LoginAnimation, { LoginAnimationHandle } from "@/components/LoginAnimation";

type Props = {
  title: string;
  subtitle: string;
  children: (animation: LoginAnimationHandle | null) => ReactNode;
};

export default function AuthSplitLayout({ title, subtitle, children }: Props) {
  const [animationApi, setAnimationApi] = useState<LoginAnimationHandle | null>(null);

  const handleReady = useCallback((api: LoginAnimationHandle) => {
    setAnimationApi(api);
  }, []);

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-[rgb(var(--bg))]">
      <div
        className="
          w-full max-w-4xl overflow-hidden
          rounded-[2rem]
          border border-[rgb(var(--border))]
          bg-[rgb(var(--card)_/_0.75)]
          shadow-[0_30px_120px_rgb(var(--shadow)/0.25)]
        "
      >
        {/* Bear LEFT, Form RIGHT (nice balance) */}
        <div className="grid md:grid-cols-2">
          {/* LEFT: animation panel */}
          <div
            className="
              relative flex items-center justify-center
              p-8 md:p-10
              border-b border-[rgb(var(--border))] md:border-b-0 md:border-r
              bg-[rgb(var(--card2)_/_0.55)]
            "
          >
            {/* Grid background (subtle, theme-safe) */}
            <div
              className="
                absolute inset-0 pointer-events-none opacity-60
                bg-[linear-gradient(to_right,rgb(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--border)/0.35)_1px,transparent_1px)]
                bg-[size:56px_56px]
              "
            />

            {/* Soft glow (theme-safe) */}
            <div className="absolute -top-20 -right-24 h-72 w-72 rounded-full bg-[rgb(var(--primary)_/_0.12)] blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[rgb(var(--primary)_/_0.10)] blur-3xl" />

            {/* Circle frame */}
            <div
              className="
                relative z-10
                h-64 w-64 md:h-80 md:w-80
                rounded-full overflow-hidden
                flex items-center justify-center

                /* IMPORTANT: fill matches theme (works in light + dark) */
                bg-[rgb(var(--card2))]
                ring-1 ring-[rgb(var(--border))]
                shadow-[0_30px_90px_rgb(var(--shadow)/0.30)]
              "
            >
              {/* subtle gloss */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              <LoginAnimation onReady={handleReady} />
            </div>

            <p className="absolute bottom-6 md:bottom-8 text-xs text-[rgb(var(--muted2))]">
              TutorLink Secure Login
            </p>
          </div>

          {/* RIGHT: form */}
          <div className="p-8 md:p-10">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
                {title}
              </h1>
              <p className="mt-2 text-sm text-[rgb(var(--muted))]">{subtitle}</p>
            </div>

            {children(animationApi)}
          </div>
        </div>
      </div>
    </div>
  );
}
