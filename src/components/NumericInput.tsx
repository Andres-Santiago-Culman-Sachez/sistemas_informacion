import React, { useEffect, useRef, useState } from 'react';

/**
 * NumericInput reutilizable (corrección ítem 2 / B1).
 *
 * - Valor interno como string, permite vacío temporal.
 * - inputMode="numeric", selecciona todo al enfocar.
 * - No concatena ceros iniciales (0100000 -> 100000).
 * - Convierte a número solo al enviar (el padre usa Number(value || 0)).
 *
 * API: value puede ser string|number, onChange emite string de dígitos
 * (vacío permitido). El padre convierte con Number(...) al enviar.
 */
interface NumericInputProps {
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  min?: number;
  max?: number;
  autoFocus?: boolean;
}

function normalizeDigits(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  // Quita ceros a la izquierda conservando un solo cero si es todo ceros
  return digits.replace(/^0+(?=\d)/, '');
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  required,
  disabled,
  placeholder,
  className,
  id,
  name,
  min,
  max,
  autoFocus,
}) => {
  const [internal, setInternal] = useState<string>(() => normalizeDigits(String(value ?? '')));
  const focusedRef = useRef(false);

  // Sincroniza cuando el valor externo cambia (p. ej. reset del formulario)
  useEffect(() => {
    if (focusedRef.current) return;
    const next = normalizeDigits(String(value ?? ''));
    setInternal((prev) => (prev === next ? prev : next));
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    focusedRef.current = true;
    // Selecciona todo al enfocar para no concatenar ceros/dígitos
    e.currentTarget.select();
  };

  const handleBlur = () => {
    focusedRef.current = false;
    // Permite vacío temporal mientras se edita; al salir se deja vacío
    // para que `required` / Number(value || 0) lo manejen al enviar.
    // No forzamos "0" aquí para no perder el estado vacío.
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = normalizeDigits(e.target.value);
    setInternal(next);
    onChange(next);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      id={id}
      name={name}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      autoFocus={autoFocus}
      min={min}
      max={max}
      value={internal}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className={
        className ??
        'w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono'
      }
    />
  );
};

export default NumericInput;
