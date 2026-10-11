import { useId } from "react";

interface BrandLogoProps {
  size?: number;
  className?: string;
}

/**
 * Brand mark from the design-system accent palette: an ascending bar chart
 * with a trend line inside a rounded badge. Stays readable from favicon size
 * (16px) up to the login headline.
 */
export function BrandLogo({ size = 34, className }: BrandLogoProps) {
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5B8DEF" />
          <stop offset="0.55" stopColor="#2F5FBF" />
          <stop offset="1" stopColor="#1D3F8C" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="15.25"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />

      <rect x="13" y="37" width="9" height="13" rx="3" fill="#FFFFFF" fillOpacity="0.62" />
      <rect x="26" y="30" width="9" height="20" rx="3" fill="#FFFFFF" fillOpacity="0.82" />
      <rect x="39" y="22" width="9" height="28" rx="3" fill="#FFFFFF" />

      <path
        d="M13 31L26 22.5L43 14"
        fill="none"
        stroke="#BCD3FF"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="43" cy="14" r="2.8" fill="#FFFFFF" />
    </svg>
  );
}
