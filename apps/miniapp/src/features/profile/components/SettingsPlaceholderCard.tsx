import { Card } from "../../../components/ui/Card";

const legalLinks = [
  {
    href: "https://ton-agent-ads-landing.vercel.app/terms",
    label: "Terms of Use",
  },
  {
    href: "https://ton-agent-ads-landing.vercel.app/privacy",
    label: "Privacy Policy",
  },
];

export const SettingsPlaceholderCard = () => {
  return (
    <Card>
      <div className="placeholder-card">
        <h2 className="placeholder-card__title">Settings and preferences</h2>
        <p className="placeholder-card__copy">
          Notification rules, campaign defaults, and account preferences will
          appear here in a later phase.
        </p>
        <div className="placeholder-card__links">
          {legalLinks.map((item) => (
            <a
              key={item.href}
              className="placeholder-card__link"
              href={item.href}
              rel="noreferrer"
              target="_blank"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </Card>
  );
};
