import { Card } from "./Card";

export const LoadingCard = () => {
  return (
    <Card className="loading-card" muted>
      <div className="loading-card__preview" />
      <div className="loading-card__body">
        <div className="loading-card__line loading-card__line--short" />
        <div className="loading-card__line loading-card__line--long" />
        <div className="loading-card__line loading-card__line--medium" />
        <div className="loading-card__line loading-card__line--long" />
      </div>
    </Card>
  );
};
