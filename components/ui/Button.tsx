
import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}) => {
  // Base styles: Added active:scale for tactile feel
  const baseStyles = 'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';
  
  // Variants
  const variants = {
    primary: 'bg-brand-green text-white hover:bg-[#9BC12A] hover:shadow-lg hover:shadow-brand-green/20 border border-transparent',
    secondary: 'bg-white text-brand-green border-2 border-brand-green hover:bg-brand-green hover:text-white',
    outline: 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 hover:border-gray-300',
    ghost: 'hover:bg-gray-100 text-gray-700 hover:text-brand-dark',
    destructive: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
  };

  // Sizes
  const sizes = {
    sm: 'h-8 px-4 text-xs tracking-wide',
    md: 'h-11 px-6 text-sm tracking-wide',
    lg: 'h-14 px-8 text-base tracking-wide',
  };

  const variantClass = variants[variant];
  const sizeClass = sizes[size];

  return (
    <button
      className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
