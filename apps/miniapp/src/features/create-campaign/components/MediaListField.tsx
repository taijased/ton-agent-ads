import { Button } from "../../../components/ui/Button";

interface MediaListFieldProps {
  error?: string;
  onChange: (value: string[]) => void;
  value: string[];
}

export const MediaListField = ({
  error,
  onChange,
  value,
}: MediaListFieldProps) => {
  const mediaItems = value.length === 0 ? [""] : value;

  const handleChange = (index: number, nextValue: string) => {
    const nextItems = [...mediaItems];
    nextItems[index] = nextValue;
    onChange(nextItems);
  };

  const handleRemove = (index: number) => {
    const nextItems = mediaItems.filter((_, itemIndex) => itemIndex !== index);
    onChange(nextItems.filter((item) => item.trim().length > 0));
  };

  return (
    <div className="field">
      <div className="field__label">Media array</div>

      <div className="media-list">
        {mediaItems.map((item, index) => (
          <div className="media-row" key={`media-${index}`}>
            <input
              className="field__control"
              id={index === 0 ? "campaign-draft-media-add" : undefined}
              inputMode="url"
              onChange={(event) => {
                handleChange(index, event.currentTarget.value);
              }}
              placeholder="https://cdn.example.com/creative.jpg"
              value={item}
            />

            <Button
              disabled={mediaItems.length === 1 && item.trim().length === 0}
              onClick={() => {
                handleRemove(index);
              }}
              size="small"
              type="button"
              variant="ghost"
            >
              Remove
            </Button>
          </div>
        ))}

        <div className="media-placeholder">
          <p className="media-placeholder__title">Hosted assets for now</p>
          <p className="media-placeholder__copy">
            Upload handling is still out of scope, so this step keeps creative
            input lightweight with direct URLs.
          </p>
        </div>

        <Button
          onClick={() => {
            onChange([...value, ""]);
          }}
          size="small"
          type="button"
          variant="secondary"
        >
          Add asset URL
        </Button>
      </div>

      {error ? <p className="field__error">{error}</p> : null}
      {!error ? (
        <p className="field__description">
          Add one or more image or video links. Empty rows are ignored when the
          campaign is created.
        </p>
      ) : null}
    </div>
  );
};
