import { useState, type KeyboardEvent } from "react";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/cn";

interface TagsFieldProps {
  error?: string;
  id?: string;
  onChange: (value: string[]) => void;
  suggestions: readonly string[];
  value: string[];
}

const hasTag = (tags: string[], tag: string): boolean =>
  tags.some((value) => value.toLowerCase() === tag.toLowerCase());

export const TagsField = ({
  error,
  id = "campaign-draft-tags-input",
  onChange,
  suggestions,
  value,
}: TagsFieldProps) => {
  const [query, setQuery] = useState("");

  const addTag = (rawValue: string) => {
    const nextTag = rawValue.trim();

    if (nextTag.length === 0 || hasTag(value, nextTag)) {
      setQuery("");
      return;
    }

    onChange([...value, nextTag]);
    setQuery("");
  };

  const filteredSuggestions = suggestions.filter((tag) => {
    if (hasTag(value, tag)) {
      return false;
    }

    if (query.trim().length === 0) {
      return true;
    }

    return tag.toLowerCase().includes(query.trim().toLowerCase());
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    addTag(query);
  };

  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">Tags</span>

      <div
        className={cn("tags-field", error ? "tags-field--error" : undefined)}
      >
        <div className="tags-field__header">
          {value.length > 0 ? (
            <div className="chip-list">
              {value.map((tag) => (
                <button
                  className="tag-chip tag-chip--button"
                  key={tag}
                  onClick={() => {
                    onChange(value.filter((item) => item !== tag));
                  }}
                  type="button"
                >
                  {tag}
                  <span aria-hidden="true">x</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="tags-field__empty">
              Add tags for verticals, audience, or conversion intent.
            </p>
          )}
        </div>

        <div className="tags-field__input-row">
          <input
            autoComplete="off"
            className="tags-field__input"
            id={id}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search or create a tag"
            value={query}
          />
          <Button
            disabled={query.trim().length === 0}
            onClick={() => {
              addTag(query);
            }}
            size="small"
            type="button"
            variant="secondary"
          >
            Add
          </Button>
        </div>

        {filteredSuggestions.length > 0 ? (
          <div className="chip-list">
            {filteredSuggestions.map((tag) => (
              <button
                className="tag-chip tag-chip--ghost"
                key={tag}
                onClick={() => {
                  addTag(tag);
                }}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <p className="field__error">{error}</p> : null}
      {!error ? (
        <p className="field__description">
          Search suggestions or create your own. Tags stay editable across the
          whole wizard.
        </p>
      ) : null}
    </label>
  );
};
