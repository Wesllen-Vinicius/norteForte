import * as React from "react";
import { IMaskInput } from "react-imask";
import { cn } from "@/lib/utils";

interface MaskedInputProps {
  mask: any;
  name: string;
  value?: string | number;
  placeholder?: string;
  onChange: (...event: any[]) => void;
  onBlur?: (...event: any[]) => void;
  className?: string;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ onChange, name, value, ...props }, ref) => {
    return (
      <IMaskInput
        {...props}
        inputRef={ref}
        name={name}
        // CORREÇÃO: Converte explicitamente o valor para string.
        // Trata também casos de nulo/indefinido para evitar erros.
        value={value == null ? "" : String(value)}
        onAccept={(val) => {
          // O evento 'onAccept' da biblioteca é usado para notificar o react-hook-form
          onChange({ target: { name, value: val } });
        }}
        overwrite
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          props.className
        )}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";

export { MaskedInput };
