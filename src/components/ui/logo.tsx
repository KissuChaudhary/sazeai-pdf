import React from "react";

export default function SazeAILogo(props: React.ComponentProps<"svg">) {
  return (
    <svg
      width={190}
      height={50} // Reduced overall height
      viewBox="0 0 190 50"
      fill="none"
      xmlns=""
      {...props}
    >
      {/* --- DEFINITIONS --- */}
      <defs>
        {/* Dark Premium Background Gradient */}
        <linearGradient
          id="bg_gradient_sm"
          x1="2"
          y1="5"
          x2="42"
          y2="45"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#333333" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>

        {/* Metallic / Silver Gradient for the Icon */}
        <linearGradient
          id="icon_gradient_sm"
          x1="10"
          y1="10"
          x2="35"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#999999" />
        </linearGradient>

        {/* Adjusted Drop Shadow */}
        <filter
          id="shadow_filter_sm"
          x="-2"
          y="1"
          width="52"
          height="52"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy={3} />
          <feGaussianBlur stdDeviation={2} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow"
            result="shape"
          />
        </filter>
      </defs>

      {/* --- THE ICON MARK (Scaled Down) --- */}
      <g filter="url(#shadow_filter_sm)">
        {/* 1. The Container (Squircle) - Size reduced to 40x40 */}
        <rect
          x="2"
          y="5"
          width="40"
          height="40"
          rx="10" // Slightly tighter corner radius
          fill="url(#bg_gradient_sm)"
        />

        {/* 2. The "S" Symbol - Compact Version */}
        <path
          d="M28 15H20C17.7909 15 16 16.7909 16 19V20C16 21.6569 17.3431 23 19 23H25C27.2091 23 29 24.7909 29 27V28C29 30.2091 27.2091 32 25 32H16"
          stroke="url(#icon_gradient_sm)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Accent Dot */}
        <circle cx="16.5" cy="15" r="2" fill="#B0B0B0" />
      </g>

      {/* --- TEXT ELEMENTS --- */}
      <g transform="translate(52, 9)">
        {/* Main Title: Saze AI */}
        <text
          x="0"
          y="18"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="bold"
          fontSize="22" 
          fill="#2C2C2C"
          letterSpacing="-0.5"
        >
          Saze AI
        </text>

        {/* Subtitle: PDF Summarizer */}
        <text
          x="0" 
          y="31" 
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="600"
          fontSize="8.5"
          fill="#666666" 
          letterSpacing="0.8"
          style={{ textTransform: "uppercase" }}
        >
          PDF Summarizer
        </text>
      </g>
    </svg>
  );
}