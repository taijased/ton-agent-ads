import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  description?: string;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  requiredIndicator?: boolean;
  suffix?: string;
}

export const TextField = ({
  description,
  error,
  id,
  label,
  onChange,
  requiredIndicator = false,
  suffix,
  ...props
}: TextFieldProps) => {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">
        {label}
        {requiredIndicator ? <span className="field__required">*</span> : null}
      </span>

      <span className="field__row">
        <input
          className={cn(
            "field__control",
            suffix ? "field__control--with-suffix" : undefined,
            error ? "field__control--error" : undefined,
          )}
          id={id}
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
          {...props}
        />
        {suffix ? <span className="field__suffix">{suffix}</span> : null}
      </span>

      {error ? <p className="field__error">{error}</p> : null}
      {!error && description ? (
        <p className="field__description">{description}</p>
      ) : null}
    </label>
  );
};
