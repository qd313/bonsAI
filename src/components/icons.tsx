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

/** Permissions tab: stroke icon for inline UI and Decky tab title. */
const strokeForTabSize = (size: number) => (size > 72 ? 2.5 : size > 48 ? 2.25 : 1.35);

export const LockIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <IconShell size={size}>
    <FiLock
      size={size}
      strokeWidth={strokeForTabSize(size)}
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
      strokeWidth={strokeForTabSize(size)}
      aria-hidden
      style={{ display: "block" }}
    />
  </IconShell>
);

/**
 * Main tab title: outline bonsai canopy + pot (stroke-only), sized like FiSettings for QAM parity.
 */
export const BonsaiTreeTabIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <IconShell size={size}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block", transform: "translateY(-2px)" }}
    >
      <path
        d="M12 6c-1.8 0-3.3 1.2-3.7 2.8A3.2 3.2 0 0 0 5.5 12c0 1.8 1.4 3.2 3.2 3.2c1.2 0 2.2-.5 2.9-1.4c.5.9 1.5 1.4 2.7 1.4c1.8 0 3.2-1.4 3.2-3.2c0-1.6-1.2-3-2.7-3.2A3.8 3.8 0 0 0 12 6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={size > 22 ? 1.08 : 1}
        strokeLinejoin="round"
      />
      <path
        d="M12 14.5v3.2m-4.8 0h9.6l-1.1 2.3H8.3l-1.1-2.3Z"
        stroke="currentColor"
        strokeWidth={size > 22 ? 1.02 : 0.95}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconShell>
);

/** This bug icon marks the debug/error inspection tab. */
export const BugIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M9 8.5A3 3 0 0 1 12 6a3 3 0 0 1 3 2.5M8 10h8v4.3a4 4 0 0 1-8 0V10Z"
        stroke="currentColor"
        strokeWidth={size > 72 ? 1.75 : 1.45}
        strokeLinecap="round"
      />
      <path
        d="M7 12H4m13 0h3M9 16l-2 2m8-2l2 2M9 8L7 6m8 2l2-2"
        stroke="currentColor"
        strokeWidth={size > 72 ? 1.65 : 1.35}
        strokeLinecap="round"
      />
    </svg>
  </IconShell>
);

/** Ollama tab title: official Ollama mark (filled silhouette, recognizable at tab-strip size). */
export const OllamaTabIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <IconShell size={size}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d="M16.361 10.26a.894.894 0 0 0-.558.47l-.072.148.001.207c0 .193.004.217.059.353.076.193.152.312.291.448.24.238.51.3.872.205a.86.86 0 0 0 .517-.436.752.752 0 0 0 .08-.498c-.064-.453-.33-.782-.724-.897a1.06 1.06 0 0 0-.466 0zm-9.203.005c-.305.096-.533.32-.65.639a1.187 1.187 0 0 0-.06.52c.057.309.31.59.598.667.362.095.632.033.872-.205.14-.136.215-.255.291-.448.055-.136.059-.16.059-.353l.001-.207-.072-.148a.894.894 0 0 0-.565-.472 1.02 1.02 0 0 0-.474.007Zm4.184 2c-.131.071-.223.25-.195.383.031.143.157.288.353.407.105.063.112.072.117.136.004.038-.01.146-.029.243-.02.094-.036.194-.036.222.002.074.07.195.143.253.064.052.076.054.255.059.164.005.198.001.264-.03.169-.082.212-.234.15-.525-.052-.243-.042-.28.087-.355.137-.08.281-.219.324-.314a.365.365 0 0 0-.175-.48.394.394 0 0 0-.181-.033c-.126 0-.207.03-.355.124l-.085.053-.053-.032c-.219-.13-.259-.145-.391-.143a.396.396 0 0 0-.193.032zm.39-2.195c-.373.036-.475.05-.654.086-.291.06-.68.195-.951.328-.94.46-1.589 1.226-1.787 2.114-.04.176-.045.234-.045.53 0 .294.005.357.043.524.264 1.16 1.332 2.017 2.714 2.173.3.033 1.596.033 1.896 0 1.11-.125 2.064-.727 2.493-1.571.114-.226.169-.372.22-.602.039-.167.044-.23.044-.523 0-.297-.005-.355-.045-.531-.288-1.29-1.539-2.304-3.072-2.497a6.873 6.873 0 0 0-.855-.031zm.645.937a3.283 3.283 0 0 1 1.44.514c.223.148.537.458.671.662.166.251.26.508.303.82.02.143.01.251-.043.482-.08.345-.332.705-.672.957a3.115 3.115 0 0 1-.689.348c-.382.122-.632.144-1.525.138-.582-.006-.686-.01-.853-.042-.57-.107-1.022-.334-1.35-.68-.264-.28-.385-.535-.45-.946-.03-.192.025-.509.137-.776.136-.326.488-.73.836-.963.403-.269.934-.46 1.422-.512.187-.02.586-.02.773-.002zm-5.503-11a1.653 1.653 0 0 0-.683.298C5.617.74 5.173 1.666 4.985 2.819c-.07.436-.119 1.04-.119 1.503 0 .544.064 1.24.155 1.721.02.107.031.202.023.208a8.12 8.12 0 0 1-.187.152 5.324 5.324 0 0 0-.949 1.02 5.49 5.49 0 0 0-.94 2.339 6.625 6.625 0 0 0-.023 1.357c.091.78.325 1.438.727 2.04l.13.195-.037.064c-.269.452-.498 1.105-.605 1.732-.084.496-.095.629-.095 1.294 0 .67.009.803.088 1.266.095.555.288 1.143.503 1.534.071.128.243.393.264.407.007.003-.014.067-.046.141a7.405 7.405 0 0 0-.548 1.873c-.062.417-.071.552-.071.991 0 .56.031.832.148 1.279L3.42 24h1.478l-.05-.091c-.297-.552-.325-1.575-.068-2.597.117-.472.25-.819.498-1.296l.148-.29v-.177c0-.165-.003-.184-.057-.293a.915.915 0 0 0-.194-.25 1.74 1.74 0 0 1-.385-.543c-.424-.92-.506-2.286-.208-3.451.124-.486.329-.918.544-1.154a.787.787 0 0 0 .223-.531c0-.195-.07-.355-.224-.522a3.136 3.136 0 0 1-.817-1.729c-.14-.96.114-2.005.69-2.834.563-.814 1.353-1.336 2.237-1.475.199-.033.57-.028.776.01.226.04.367.028.512-.041.179-.085.268-.19.374-.431.093-.215.165-.333.36-.576.234-.29.46-.489.822-.729.413-.27.884-.467 1.352-.561.17-.035.25-.04.569-.04.319 0 .398.005.569.04a4.07 4.07 0 0 1 1.914.997c.117.109.398.457.488.602.034.057.095.177.132.267.105.241.195.346.374.43.14.068.286.082.503.045.343-.058.607-.053.943.016 1.144.23 2.14 1.173 2.581 2.437.385 1.108.276 2.267-.296 3.153-.097.15-.193.27-.333.419-.301.322-.301.722-.001 1.053.493.539.801 1.866.708 3.036-.062.772-.26 1.463-.533 1.854a2.096 2.096 0 0 1-.224.258.916.916 0 0 0-.194.25c-.054.109-.057.128-.057.293v.178l.148.29c.248.476.38.823.498 1.295.253 1.008.231 2.01-.059 2.581a.845.845 0 0 0-.044.098c0 .006.329.009.732.009h.732l.02-.074.036-.134c.019-.076.057-.3.088-.516.029-.217.029-1.016 0-1.258-.11-.875-.295-1.57-.597-2.226-.032-.074-.053-.138-.046-.141.008-.005.057-.074.108-.152.376-.569.607-1.284.724-2.228.031-.26.031-1.378 0-1.628-.083-.645-.182-1.082-.348-1.525a6.083 6.083 0 0 0-.329-.7l-.038-.064.131-.194c.402-.604.636-1.262.727-2.04a6.625 6.625 0 0 0-.024-1.358 5.512 5.512 0 0 0-.939-2.339 5.325 5.325 0 0 0-.95-1.02 8.097 8.097 0 0 1-.186-.152.692.692 0 0 1 .023-.208c.208-1.087.201-2.443-.017-3.503-.19-.924-.535-1.658-.98-2.082-.354-.338-.716-.482-1.15-.455-.996.059-1.8 1.205-2.116 3.01a6.805 6.805 0 0 0-.097.726c0 .036-.007.066-.015.066a.96.96 0 0 1-.149-.078A4.857 4.857 0 0 0 12 3.03c-.832 0-1.687.243-2.456.698a.958.958 0 0 1-.148.078c-.008 0-.015-.03-.015-.066a6.71 6.71 0 0 0-.097-.725C8.997 1.392 8.337.319 7.46.048a2.096 2.096 0 0 0-.585-.041Zm.293 1.402c.248.197.523.759.682 1.388.03.113.06.244.069.292.007.047.026.152.041.233.067.365.098.76.102 1.24l.002.475-.12.175-.118.178h-.278c-.324 0-.646.041-.954.124l-.238.06c-.033.007-.038-.003-.057-.144a8.438 8.438 0 0 1 .016-2.323c.124-.788.413-1.501.696-1.711.067-.05.079-.049.157.013zm9.825-.012c.17.126.358.46.498.888.28.854.36 2.028.212 3.145-.019.14-.024.151-.057.144l-.238-.06a3.693 3.693 0 0 0-.954-.124h-.278l-.119-.178-.119-.175.002-.474c.004-.669.066-1.19.214-1.772.157-.623.434-1.185.68-1.382.078-.062.09-.063.159-.012z" />
    </svg>
  </IconShell>
);

/** About tab title: vector lowercase “i” (skew reads serif-italic; avoids Steam caps on text nodes). */
export const AboutTabTitleIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="currentColor" transform="translate(12 12) skewX(-10) translate(-12 -12)">
        <circle cx="12" cy="6.2" r="2.35" />
        <rect x="10.15" y="9.9" width="3.7" height="11.6" rx="1.15" />
      </g>
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

/** Paste-from-clipboard control in the unified input strip (lower-left). */
export const PasteClipboardIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <IconShell size={size}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="7.5" y="4.5" width="11" height="14" rx="1.6" stroke="currentColor" strokeWidth="1.45" />
      <path d="M9.25 4.5h7.5a1.6 1.6 0 0 1 1.6 1.6V7H7.65V6.1a1.6 1.6 0 0 1 1.6-1.6Z" stroke="currentColor" strokeWidth="1.45" />
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
