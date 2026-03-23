import { Button } from "./Button";
import { Card } from "./Card";

interface EmptyStateProps {
  actionLabel: string;
  description: string;
  onAction: () => void;
  title: string;
}

export const EmptyState = ({
  actionLabel,
  description,
  onAction,
  title,
}: EmptyStateProps) => {
  return (
    <Card className="empty-state" muted>
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__description">{description}</p>
      <div className="empty-state__action">
        <Button fullWidth onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </Card>
  );
};
