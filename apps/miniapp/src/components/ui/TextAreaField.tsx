import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface TextAreaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> {
  description?: string;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  requiredIndicator?: boolean;
}

export const TextAreaField = ({
  description,
  error,
  id,
  label,
  onChange,
  requiredIndicator = false,
  ...props
}: TextAreaFieldProps) => {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">
        {label}
        {requiredIndicator ? <span className="field__required">*</span> : null}
      </span>

      <textarea
        className={cn(
          "field__control",
          "field__textarea",
          error ? "field__control--error" : undefined,
        )}
        id={id}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
        {...props}
      />

      {error ? <p className="field__error">{error}</p> : null}
      {!error && description ? (
        <p className="field__description">{description}</p>
      ) : null}
    </label>
  );
};
