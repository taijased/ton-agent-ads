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

export const EditIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg aria-hidden="true" {...iconProps} {...props}>
      <path d="M12 20H21" />
      <path d="M16.5 3.5A2.121 2.121 0 0 1 19.5 6.5L8 18L3 19L4 14L16.5 3.5Z" />
    </svg>
  );
};

export const SearchIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg aria-hidden="true" {...iconProps} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20L16.65 16.65" />
    </svg>
  );
};

export const ChevronDownIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg aria-hidden="true" {...iconProps} {...props}>
      <path d="M6 9L12 15L18 9" />
    </svg>
  );
};
