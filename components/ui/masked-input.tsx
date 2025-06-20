import * as React from "react";
import InputMask, { Props as InputMaskProps } from "react-input-mask";
import { Input } from "@/components/ui/input";

// Estendemos as props do InputMask e permitimos qualquer outra prop de um input normal
type MaskedInputProps = InputMaskProps & React.InputHTMLAttributes<HTMLInputElement>;

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onChange, ...props }, ref) => {
    return (
      <InputMask mask={mask} value={value} onChange={onChange}>
        {/* O InputMask passa as props para seu filho (child function).
          O 'as any' é uma forma de contornar uma pequena incompatibilidade de tipos entre a lib e o Radix.
        */}
        {(inputProps: any) => <Input {...inputProps} {...props} ref={ref} />}
      </InputMask>
    );
  }
);

MaskedInput.displayName = "MaskedInput";

export { MaskedInput };
