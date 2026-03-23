import type { SVGProps } from "react";

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 2,
  viewBox: "0 0 24 24",
} as const;

export const CampaignsIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg aria-hidden="true" {...iconProps} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
};

export const NewCampaignIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg aria-hidden="true" {...iconProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8V16" />
      <path d="M8 12H16" />
    </svg>
  );
};

export const ProfileIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg aria-hidden="true" {...iconProps} {...props}>
      <path d="M19 21C19 17.6863 15.866 15 12 15C8.13401 15 5 17.6863 5 21" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
};

export const PlusIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg aria-hidden="true" {...iconProps} {...props}>
      <path d="M12 5V19" />
      <path d="M5 12H19" />
    </svg>
  );
};
