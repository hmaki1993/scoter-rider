import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

// Helper to standardise hand-drawn styling props
const getProps = ({ size = 24, color = 'currentColor', strokeWidth = 2, ...rest }: IconProps) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  style: {
    display: 'inline-block',
    verticalAlign: 'middle',
    overflow: 'visible',
    ...rest.style,
  },
  ...rest
});

// 1. MapPin (Hand-drawn map location pin with overlapping sketch lines)
export const MapPin = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Outer Pin Outline */}
    <path d="M12.2 2.1 C7.5 1.8, 3.8 5.6, 3.5 10.8 C3.2 15.5, 9.1 19.8, 11.6 21.6 C11.9 21.8, 12.3 21.8, 12.5 21.6 C15.1 19.8, 20.9 15.5, 20.6 10.8 C20.3 5.6, 16.7 1.8, 12.2 2.1 Z" />
    {/* Sketch Accent (Double Line overlay for hand-drawn look) */}
    <path d="M4.8 9.5 C5.1 6.2, 8.2 3.8, 12.1 3.9 C15.5 4.0, 18.9 6.8, 19.1 10.5" opacity={0.65} strokeWidth={Math.max(1, (props.strokeWidth || 2) - 0.5)} />
    {/* Inner Pin Hole */}
    <path d="M12.1 8.2 C13.7 8.1, 15.1 9.4, 14.9 11.1 C14.6 12.6, 13.1 13.9, 11.6 13.6 C10.1 13.3, 9.2 11.8, 9.5 10.3 C9.7 9.0, 10.8 8.3, 12.1 8.2 Z" />
  </svg>
);

// 2. AlertTriangle (Hand-drawn warning alert triangle)
export const AlertTriangle = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Triangle Base */}
    <path d="M10.7 2.9 L1.8 18.2 C1.2 19.3, 1.8 20.8, 3.2 20.9 L20.7 21.1 C22.1 21.2, 22.9 19.7, 22.2 18.5 L13.4 3.1 C12.8 1.9, 11.3 1.8, 10.7 2.9 Z" />
    {/* Sketch Accent Line */}
    <path d="M11.5 4.2 L3.2 18.9 C2.9 19.5, 3.2 20.1, 4.1 20.2" opacity={0.6} strokeWidth={Math.max(1, (props.strokeWidth || 2) - 0.5)} />
    {/* Exclamation point (Warning line) */}
    <path d="M11.9 8.2 C12.2 8.2, 12.1 13.1, 12.0 13.8" />
    {/* Exclamation point (Warning dot) */}
    <path d="M11.9 17.2 C12.2 17.2, 12.1 17.8, 11.9 17.8 C11.7 17.8, 11.7 17.2, 11.9 17.2" strokeWidth={(props.strokeWidth || 2) + 1.5} />
  </svg>
);

// 3. Settings (Hand-drawn colorful multi-gear matching setting.png doodle style)
export const Settings = (props: IconProps) => (
  <svg {...getProps(props)} stroke="none" strokeWidth={0}>
    {/* Top-Left Gear (Grey-Blue) */}
    <g stroke="#78909c" strokeWidth={props.strokeWidth || 2.2} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 8.5 3 Q 10 3, 9.8 4.5 C 11.2 5.0, 12.3 6.0, 12.8 7.3 Q 14.3 7.0, 14.3 8.5 Q 14.3 10.0, 12.8 9.7 C 12.3 11.0, 11.2 12.0, 9.8 12.5 Q 10 14, 8.5 14 Q 7 14, 7.2 12.5 C 5.8 12.0, 4.7 11.0, 4.2 9.7 Q 2.7 10.0, 2.7 8.5 Q 2.7 7.0, 4.2 7.3 C 4.7 6.0, 5.8 5.0, 7.2 4.5 Q 7 3, 8.5 3 Z" />
      <path d="M 8.5 6.5 C 9.6 6.5, 10.5 7.4, 10.5 8.5 C 10.5 9.6, 9.6 10.5, 8.5 10.5 C 7.4 10.5, 6.5 9.6, 6.5 8.5 C 6.5 7.4, 7.4 6.5, 8.5 6.5 Z" />
    </g>

    {/* Top-Right Gear (Yellow-Orange) */}
    <g stroke="#ffb300" strokeWidth={props.strokeWidth || 2.2} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 17.5 5 Q 18.8 5, 18.6 6.2 C 19.5 6.5, 20.4 7.3, 20.8 8.3 Q 22.1 8.0, 22.1 9.3 Q 22.1 10.6, 20.8 10.3 C 20.4 11.3, 19.5 12.1, 18.6 12.4 Q 18.8 13.6, 17.5 13.6 Q 16.2 13.6, 16.4 12.4 C 15.5 12.1, 14.6 11.3, 14.2 10.3 Q 12.9 10.6, 12.9 9.3 Q 12.9 8.0, 14.2 8.3 C 14.6 7.3, 15.5 6.5, 16.4 6.2 Q 16.2 5, 17.5 5 Z" />
      <path d="M 17.5 8 C 18.3 8, 19 8.7, 19 9.5 C 19 10.3, 18.3 11, 17.5 11 C 16.7 11, 16 10.3, 16 9.5 C 16 8.7, 16.7 8, 17.5 8 Z" />
    </g>

    {/* Bottom Gear (Red-Coral) */}
    <g stroke="#ff5252" strokeWidth={props.strokeWidth || 2.2} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 13 13 Q 14.3 13, 14.1 14.2 C 15.0 14.5, 15.9 15.3, 16.3 16.3 Q 17.6 16.0, 17.6 17.3 Q 17.6 18.6, 16.3 18.3 C 15.9 19.3, 15.0 20.1, 14.1 20.4 Q 14.3 21.6, 13 21.6 Q 11.7 21.6, 11.9 20.4 C 11.0 20.1, 10.1 19.3, 9.7 18.3 Q 8.4 18.6, 8.4 17.3 Q 8.4 16.0, 9.7 16.3 C 10.1 15.3, 11.0 14.5, 11.9 14.2 Q 11.7 13, 13 13 Z" />
      <path d="M 13 16 C 13.8 16, 14.5 16.7, 14.5 17.5 C 14.5 18.3, 13.8 19, 13 19 C 12.2 19, 11.5 18.3, 11.5 17.5 C 11.5 16.7, 12.2 16, 13 16 Z" />
    </g>
  </svg>
);

// 4. Droplets (Hand-drawn engine oil canister matching oil.png doodle style)
export const Droplets = (props: IconProps) => (
  <svg {...getProps(props)} stroke="none" fill="none">
    {/* Canister body */}
    <path d="M 4 12 C 4 12, 4 20, 5 21 C 6 22, 17 22, 18 21 C 19 20, 19 6, 19 6 C 19 6, 13 5.5, 12 5.5 C 11 5.5, 4.5 11.5, 4 12 Z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    {/* Cap on top right */}
    <path d="M 13 5.5 L 13 3 C 13 2, 17 2, 17 3 L 17 5.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    {/* Slanted handle hole */}
    <path d="M 7 12 C 7 11.5, 12 8.5, 13 8 C 13.5 7.8, 14 8.2, 13 9.2 C 12 10.2, 7.5 13, 7 13 Z" stroke="currentColor" strokeWidth={1.5} fill="currentColor" fillOpacity={0.1} />
    {/* Big oil droplet on bottom right */}
    <path d="M 19 10 C 21.5 10, 22.5 13, 22.5 15.5 C 22.5 18, 20.5 19.5, 19 19.5 C 17.5 19.5, 15.5 18, 15.5 15.5 C 15.5 13, 16.5 10, 19 10 Z" fill="#ff9800" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    {/* Two small droplets on top left */}
    <path d="M 2.5 2.5 C 3.5 2.5, 4 3.5, 4 4.5 C 4 5.5, 3 6, 2.5 6 C 2 6, 1 5.5, 1 4.5 C 1 3.5, 1.5 2.5, 2.5 2.5 Z" fill="#ff9800" stroke="currentColor" strokeWidth={1} />
    <path d="M 6.5 4.5 C 7.3 4.5, 7.7 5.2, 7.7 6 C 7.7 6.8, 6.9 7.2, 6.5 7.2 C 6.1 7.2, 5.3 6.8, 5.3 6 C 5.3 5.2, 5.7 4.5, 6.5 4.5 Z" fill="#ff9800" stroke="currentColor" strokeWidth={1} />
  </svg>
);

// 5. Bell (Hand-drawn notification bell)
export const Bell = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Bell Body */}
    <path d="M12.2 2.8 C15.8 3.1, 18.8 5.8, 18.5 9.8 C18.2 13.8, 20.1 15.8, 20.3 16.8 C20.5 17.8, 19.2 17.9, 12.1 17.8 C5.0 17.7, 3.5 17.8, 3.7 16.8 C3.9 15.8, 5.8 13.8, 5.5 9.8 C5.2 5.8, 8.2 3.1, 12.2 2.8 Z" />
    {/* Top Ring/Loop */}
    <path d="M10.2 3.2 C9.8 1.8, 14.2 1.8, 13.8 3.2" />
    {/* Clapper (bottom ball) */}
    <path d="M10.2 19.2 C9.8 21.5, 14.2 21.5, 13.8 19.2" />
    {/* Accent double outline */}
    <path d="M6.2 11.2 C5.9 7.8, 8.5 4.8, 12.2 4.5 C15.5 4.2, 17.5 6.8, 17.6 9.8" opacity={0.65} strokeWidth={Math.max(1, (props.strokeWidth || 2) - 0.5)} />
  </svg>
);

// 6. BellOff (Hand-drawn muted bell with a diagonal strikeout)
export const BellOff = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Muted bell path chunks (broken to show line crossing) */}
    <path d="M10.2 3.2 C9.8 1.8, 14.2 1.8, 13.8 3.2" />
    <path d="M18.5 9.8 C18.3 12.2, 19.2 14.1, 20.3 16.8 C20.5 17.8, 19.2 17.9, 12.1 17.8 C9.2 17.8, 6.2 17.8, 4.8 17.5" />
    <path d="M3.7 16.8 C3.9 15.8, 5.8 13.8, 5.5 9.8 C5.3 7.8, 6.8 5.8, 8.5 4.5" />
    {/* Clapper */}
    <path d="M10.2 19.2 C9.8 21.5, 14.2 21.5, 13.8 19.2" />
    {/* Sketchy strikeout diagonal slash line */}
    <path d="M2.5 2.5 L21.5 21.5" stroke="var(--danger-color)" />
    {/* Extra sketchy double-slash fragment */}
    <path d="M1.5 3.5 L19.5 21.5" stroke="var(--danger-color)" opacity={0.4} strokeWidth={Math.max(1, (props.strokeWidth || 2) - 0.7)} />
  </svg>
);

// 7. User (Hand-drawn male avatar with blue accent matching male-user.png doodle style)
export const User = (props: IconProps) => (
  <svg {...getProps(props)} stroke="none" fill="none">
    {/* Head Outline (Top) */}
    <circle cx="12" cy="6.5" r="3.5" fill="#42a5f5" stroke="currentColor" strokeWidth={2.2} />
    {/* Sketchy accent head ring overlay */}
    <path d="M 9.5 5 C 9 6, 9.5 8, 12 8.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />

    {/* Body / Torso (Bottom) */}
    <path d="M 12 10.5 C 8.5 10.5, 7.5 12, 7.5 14 L 7.5 21.5 C 7.5 22, 16.5 22, 16.5 21.5 L 16.5 14 C 16.5 12, 15.5 10.5, 12 10.5 Z" fill="#42a5f5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 8. Camera (Hand-drawn vintage camera)
export const Camera = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Main Camera Box */}
    <path d="M3.8 8.1 L8.2 8.0 C8.8 8.0, 9.2 7.2, 9.5 6.8 L10.5 5.2 C10.9 4.5, 11.5 4.1, 12.3 4.2 L15.7 4.3 C16.5 4.4, 17.1 4.8, 17.5 5.5 L18.5 7.1 C18.8 7.5, 19.2 8.0, 19.8 8.0 L20.2 8.1 C21.6 8.3, 22.2 9.5, 22.1 12.1 L21.9 18.2 C21.8 19.8, 20.8 20.8, 19.2 20.7 L4.8 20.5 C3.2 20.4, 2.1 19.4, 2.2 17.8 L2.5 11.7 C2.6 9.1, 2.8 8.2, 3.8 8.1 Z" />
    {/* Lens (sketch circle) */}
    <path d="M12.2 9.8 C14.3 9.5, 16.2 11.4, 15.9 13.6 C15.6 15.8, 13.8 17.5, 11.6 17.2 C9.4 16.9, 7.8 15.0, 8.1 12.8 C8.4 10.6, 9.9 10.1, 12.2 9.8 Z" />
    <path d="M10.2 12.8 C10.5 11.5, 11.8 10.8, 13.1 11.2" opacity={0.7} />
    {/* Small flash flash bulb */}
    <path d="M18.2 10.8 C18.5 10.8, 18.5 11.2, 18.2 11.2 C17.9 11.2, 17.9 10.8, 18.2 10.8 Z" strokeWidth={(props.strokeWidth || 2) + 1} />
  </svg>
);

// 9. Smartphone (Hand-drawn smartphone device)
export const Smartphone = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Phone Frame */}
    <path d="M6.2 2.8 L17.8 2.5 C19.2 2.4, 20.1 3.5, 19.9 5.2 L19.1 18.8 C18.9 20.5, 17.8 21.6, 16.2 21.7 L4.8 21.9 C3.2 22.0, 2.3 20.9, 2.5 19.2 L3.3 5.6 C3.5 3.9, 4.8 2.9, 6.2 2.8 Z" />
    {/* Screen lines top/bottom */}
    <path d="M3.3 5.5 L19.7 5.1" />
    <path d="M2.7 18.5 L19.1 18.1" />
    {/* Dynamic Home Button circle */}
    <path d="M11.2 19.3 C11.7 19.2, 12.1 19.6, 12.0 20.1 C11.9 20.6, 11.4 20.9, 10.9 20.8 C10.4 20.7, 10.1 20.2, 10.2 19.7 C10.3 19.2, 10.7 19.4, 11.2 19.3 Z" />
    {/* Top Speaker ear piece */}
    <path d="M10.2 3.8 L13.8 3.7" />
  </svg>
);

// 10. Music (Hand-drawn music note)
export const Music = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Music note stem */}
    <path d="M9.2 17.2 L9.2 4.2 L20.2 3.2 L20.2 15.2" />
    {/* Double bar flag beam */}
    <path d="M9.2 4.2 L20.2 3.2 M9.2 7.8 L20.2 6.8" />
    {/* Bottom Note Bean 1 */}
    <path d="M6.2 17.2 C7.8 15.8, 9.8 17.2, 9.2 19.2 C8.6 21.2, 6.2 21.8, 5.2 20.2 C4.2 18.6, 4.8 17.8, 6.2 17.2 Z" fill="currentColor" fillOpacity={0.2} />
    {/* Bottom Note Bean 2 */}
    <path d="M17.2 15.2 C18.8 13.8, 20.8 15.2, 20.2 17.2 C19.6 19.2, 17.2 19.8, 16.2 18.2 C15.2 16.6, 15.8 15.8, 17.2 15.2 Z" fill="currentColor" fillOpacity={0.2} />
  </svg>
);

// 11. Fuel (Hand-drawn Jerrycan gas canister matching fuel.png doodle style)
export const Fuel = (props: IconProps) => (
  <svg {...getProps(props)} stroke="none" fill="none">
    {/* Jerrycan main body */}
    <path d="M 3 6 C 3 6, 15 5.5, 16 5.5 C 17 5.5, 18.5 7, 18.5 8 L 18.5 20 C 18.5 21.5, 17 22, 16 22 L 5 22 C 4 22, 3 21, 3 20 Z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    {/* Handle cutout */}
    <path d="M 5.5 9 L 14.5 8.5 C 15.5 8.5, 16 9, 15.5 10 C 15 11, 6 11.5, 5.5 11 L 5.5 9 Z" stroke="currentColor" strokeWidth={1.5} fill="currentColor" fillOpacity={0.1} />
    {/* Center X mark */}
    <path d="M 6 13 L 13 20 M 13 13 L 6 20" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    {/* Small center box on X */}
    <rect x="8" y="15.5" width="3" height="3" stroke="currentColor" strokeWidth={1.5} fill="none" rx="0.5" />
    {/* Spout on top-right pouring a droplet */}
    <path d="M 14.5 5.5 L 18.5 2 C 19 1.5, 20.5 2.5, 20 3.5 L 17 6.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    {/* Pouring droplet */}
    <path d="M 21.5 8 C 22.5 8, 23 9, 23 10 C 23 11, 22 11.5, 21.5 11.5 C 21 11.5, 20 11, 20 10 C 20 9, 20.5 8, 21.5 8 Z" fill="var(--accent-secondary)" stroke="currentColor" strokeWidth={1.2} />
  </svg>
);

// 12. Trash2 (Hand-drawn trash bin)
export const Trash2 = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Bin main body */}
    <path d="M4.8 6.5 L5.8 19.8 C5.9 21.2, 6.8 22.0, 8.2 22.0 L15.8 22.0 C17.2 22.0, 18.1 21.2, 18.2 19.8 L19.2 6.5" />
    {/* Top Lid */}
    <path d="M2.5 6.5 L21.5 6.5" />
    <path d="M9.2 6.2 Q10.2 3.2, 12.1 3.2 Q14.0 3.2, 14.8 6.2" />
    {/* Vertical sketchy stripes/grooves */}
    <path d="M9.2 10.2 L9.8 18.2 M12.0 10.2 L12.0 18.2 M14.8 10.2 L14.2 18.2" opacity={0.7} />
  </svg>
);

// 13. X (Hand-drawn closing cross button)
export const X = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Left-to-Right diagonal strike */}
    <path d="M4.2 4.2 C8.2 7.8, 15.8 15.5, 19.8 19.8" />
    {/* Right-to-Left diagonal strike */}
    <path d="M19.8 4.2 C15.8 8.2, 8.2 15.8, 4.2 19.8" />
    {/* Secondary sketchy accent cross outline to make it feel extra handdrawn */}
    <path d="M5.5 3.8 C9.2 7.2, 16.2 14.8, 20.2 18.5 M18.5 3.8 C14.8 7.2, 7.2 14.8, 3.8 18.5" opacity={0.4} strokeWidth={Math.max(1, (props.strokeWidth || 2) - 0.7)} />
  </svg>
);

// 14. Route (Hand-drawn tracking navigation path route)
export const Route = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Wavy line trail path */}
    <path d="M6.2 17.8 C6.2 17.8, 7.8 7.2, 12.1 11.2 C16.4 15.2, 16.8 5.2, 17.8 6.2" />
    <path d="M6.9 17.2 C7.2 10.8, 11.2 11.8, 12.8 11.0" opacity={0.4} strokeWidth={Math.max(1, (props.strokeWidth || 2) - 0.7)} />
    {/* Starting ring circle */}
    <path d="M6.2 17.2 C7.3 17.1, 8.1 17.9, 8.0 19.0 C7.9 20.1, 7.1 20.9, 6.0 20.8 C4.9 20.7, 4.1 19.9, 4.2 18.8 C4.3 17.7, 5.1 17.3, 6.2 17.2 Z" fill="currentColor" fillOpacity={0.2} />
    {/* Ending ring circle */}
    <path d="M17.8 3.2 C18.9 3.1, 19.7 3.9, 19.6 5.0 C19.5 6.1, 18.7 6.9, 17.6 6.8 C16.5 6.7, 15.7 5.9, 15.8 4.8 C15.9 3.7, 16.7 3.3, 17.8 3.2 Z" fill="currentColor" fillOpacity={0.2} />
  </svg>
);

// 15. Banknote (Hand-drawn money cash banknote)
export const Banknote = (props: IconProps) => (
  <svg {...getProps(props)}>
    {/* Outer sketchy currency box */}
    <path d="M2.8 5.8 L21.2 5.5 C22.2 5.5, 22.1 6.8, 22.0 8.2 L21.8 16.2 C21.7 17.6, 20.8 18.5, 19.8 18.5 L2.8 18.5 C1.8 18.5, 1.9 17.6, 2.0 16.2 L2.2 8.2 C2.3 6.8, 1.8 5.8, 2.8 5.8 Z" />
    {/* Center sketchy circle */}
    <path d="M12.1 9.2 C13.7 9.0, 15.0 10.3, 14.8 11.8 C14.5 13.3, 13.2 14.5, 11.7 14.3 C10.2 14.1, 9.3 12.7, 9.6 11.2 C9.9 9.8, 10.9 9.3, 12.2 9.2 Z" fill="currentColor" fillOpacity={0.15} />
    {/* Double sketchy inner frame corners */}
    <path d="M5.2 8.2 L5.2 10.2 M5.2 8.2 L7.2 8.2 M18.8 8.2 L18.8 10.2 M18.8 8.2 L16.8 8.2 M5.2 15.8 L5.2 13.8 M5.2 15.8 L7.2 15.8 M18.8 15.8 L18.8 13.8 M18.8 15.8 L16.8 15.8" opacity={0.7} />
  </svg>
);

// 16. Bike (Hand-drawn colorful Vespa scooter matching motorcycle.png doodle style)
export const Bike = (props: IconProps) => (
  <svg {...getProps(props)} stroke="none" fill="none">
    {/* Rear Wheel (Bottom-Left) */}
    <circle cx="5.5" cy="17.5" r="3.5" fill="#37474f" stroke="currentColor" strokeWidth={2} />
    <circle cx="5.5" cy="17.5" r="1.5" fill="#b0bec5" stroke="currentColor" strokeWidth={1} />

    {/* Front Wheel (Bottom-Right) */}
    <circle cx="18.5" cy="17.5" r="3.5" fill="#37474f" stroke="currentColor" strokeWidth={2} />
    <circle cx="18.5" cy="17.5" r="1.5" fill="#b0bec5" stroke="currentColor" strokeWidth={1} />

    {/* Front wheel fork stem */}
    <path d="M 18.5 17.5 L 16.5 11 L 15.5 8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />

    {/* Scooter Red Curvy Body Frame */}
    <path d="M 5.5 17.5 C 3.5 17.5, 1 15, 1 11 C 1 7.5, 5 7.5, 8 7.5 C 9.5 7.5, 10.5 12, 12 12 C 13.5 12, 14.5 7.5, 16 7.5 C 17.5 7.5, 19 9.5, 19 11 C 19 14.5, 16.5 17.5, 15 17.5 Z" fill="#ff5252" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />

    {/* Blue Seat on top */}
    <path d="M 5 7.5 C 5 6, 11 6, 11 7.5 C 11 8.5, 5 8.5, 5 7.5 Z" fill="#0288d1" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />

    {/* Steering Handlebars (top right) */}
    <path d="M 15.5 8 L 15.5 5.5 L 13.5 5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    {/* Headlight and mirror */}
    <circle cx="15.5" cy="5.5" r="1" fill="#fff" stroke="currentColor" strokeWidth={1.5} />
    <path d="M 13.5 5 Q 12 3, 11.5 3.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
  </svg>
);
