import React, { useState } from "react";
import { FiLock, FiSettings } from "react-icons/fi";
import bonsaiLogo from "../assets/icons/bonsai-logo.svg";

/**
 * This shared icon shell keeps all custom icons aligned to Decky's sizing and baseline rules.
 * It centralizes sizing behavior so icon updates do not require scattered style tweaks.
 */
const IconShell: React.FC<{ size: number; children: React.ReactNode }> = ({ size, children }) => (
  <span
    style={{
      width: size,
      height: size,
      minWidth: size,
      minHeight: size,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      verticalAlign: "middle",
      flexShrink: 0,
      color: "currentColor",
      overflow: "hidden",
    }}
  >
    {children}
  </span>
);

/** Permissions tab: lock icon matches other tab title icon sizing (see TAB_TITLE_ICON_PX_PERMISSIONS). */
export const LockIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <IconShell size={size}>
    <FiLock
      size={size}
      strokeWidth={size > 48 ? 2.25 : 1.35}
      aria-hidden
      style={{ display: "block" }}
    />
  </IconShell>
);

/** Settings tab: stroke icon reads clearly on Steam Deck CEF at small sizes (custom fill+stroke gear looked like a blob). */
export const GearIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <IconShell size={size}>
    <FiSettings
      size={size}
      strokeWidth={size > 48 ? 2.25 : 1.35}
      aria-hidden
      style={{ display: "block" }}
    />
  </IconShell>
);

/** This bug icon marks the debug/error inspection tab. */
export const BugIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9 8.5A3 3 0 0 1 12 6a3 3 0 0 1 3 2.5M8 10h8v4.3a4 4 0 0 1-8 0V10Z" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M7 12H4m13 0h3M9 16l-2 2m8-2l2 2M9 8L7 6m8 2l2-2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  </IconShell>
);

/** This mic placeholder reserves the future voice-input action affordance. */
export const AskMicIcon: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6.25" y="3.5" width="11.5" height="15" rx="5.75" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 18.5v2.8M7.75 21.5h8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </IconShell>
);

/** This stop icon communicates in-flight request cancellation. */
export const AskStopIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" fill="rgba(236, 240, 245, 0.96)" stroke="rgba(15, 22, 32, 0.14)" strokeWidth="0.85" />
      <rect x="8.35" y="8.35" width="7.3" height="7.3" rx="1.15" fill="#1a2633" />
    </svg>
  </IconShell>
);

/** This back chevron is used in compact media browser/back controls. */
export const BackChevronIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14.5 6.5 9 12l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </IconShell>
);

/** This refresh arrow is used on reload and retry affordances. */
export const RefreshArrowIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18.5 9.3A6.5 6.5 0 1 0 19 13.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="m15.8 6.2 3.1 2.9-3.9 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </IconShell>
);

/** This clear icon keeps the action visually simple without nested shape clutter. */
export const ClearIcon: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7 7l10 10M17 7l-10 10" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
    </svg>
  </IconShell>
);

/** This paperclip icon marks media attachment entry points. */
export const AttachMediaIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8.2 12.2 13.7 6.7a3 3 0 1 1 4.3 4.3l-7.2 7.2a4.7 4.7 0 0 1-6.6-6.6l7.1-7.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </IconShell>
);

/** This image icon labels attached screenshot metadata chips. */
export const ImageAttachmentIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="4.5" y="5.5" width="15" height="13" rx="1.8" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" />
      <path d="M6.5 16.5 10.5 12.8 13.4 15.6 15.7 13.5 18 16.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </IconShell>
);

/** This fallback icon is shown when the raster bonsai logo fails to load. */
const BonsaiFallbackIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 6c-1.8 0-3.3 1.2-3.7 2.8A3.2 3.2 0 0 0 5.5 12c0 1.8 1.4 3.2 3.2 3.2c1.2 0 2.2-.5 2.9-1.4c.5.9 1.5 1.4 2.7 1.4c1.8 0 3.2-1.4 3.2-3.2c0-1.6-1.2-3-2.7-3.2A3.8 3.8 0 0 0 12 6Z" fill="currentColor" />
      <path d="M12 14.5v3.2m-4.8 0h9.6l-1.1 2.3H8.3l-1.1-2.3Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </IconShell>
);

/**
 * This raster-logo component is used where explicit pixel sizing and offset tuning are needed.
 * It also includes a fallback icon so UI remains stable if the SVG asset is unavailable.
 */
export const BonsaiLogoIcon: React.FC<{ size?: number; zoom?: number; offsetX?: number; offsetY?: number }> = ({
  size = 18,
  zoom = 1.55,
  offsetX = 0,
  offsetY = -0.5,
}) => {
  const [loadFailed, setLoadFailed] = useState(false);

  if (loadFailed) {
    return <BonsaiFallbackIcon size={Math.max(14, size - 1)} />;
  }

  return (
    <IconShell size={size}>
      <img
        src={bonsaiLogo}
        alt="bonsAI logo"
        onLoad={() => {}}
        onError={() => { setLoadFailed(true); }}
        style={{
          width: Math.round(size * zoom),
          height: Math.round(size * zoom),
          objectFit: "contain",
          display: "block",
          filter: "brightness(0) invert(1)",
          mixBlendMode: "difference",
          transform: `translate(${offsetX}px, ${offsetY}px)`,
        }}
      />
    </IconShell>
  );
};

/**
 * This plugin-list icon uses a resilient vector fallback that obeys Decky font-size scaling.
 * Keeping it independent from the large inline path reduces index.tsx payload and parsing overhead.
 */
export const BonsaiSvgIcon: React.FC<{ size?: number }> = ({ size = 24 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 6c-1.8 0-3.3 1.2-3.7 2.8A3.2 3.2 0 0 0 5.5 12c0 1.8 1.4 3.2 3.2 3.2c1.2 0 2.2-.5 2.9-1.4c.5.9 1.5 1.4 2.7 1.4c1.8 0 3.2-1.4 3.2-3.2c0-1.6-1.2-3-2.7-3.2A3.8 3.8 0 0 0 12 6Z"
        fill="currentColor"
      />
      <path
        d="M12 14.5v3.2m-4.8 0h9.6l-1.1 2.3H8.3l-1.1-2.3Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
