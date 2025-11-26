import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading, className = '', ...props }) => {
  // Soft, rounded, gradient aesthetics
  const baseStyle = "px-6 py-3 font-bold text-sm tracking-wide rounded-full transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg";
  
  const variants = {
    // Pink Gradient
    primary: "bg-gradient-to-r from-pink-400 to-rose-400 text-white border-2 border-transparent hover:brightness-110",
    // White/Outline
    secondary: "bg-white text-pink-500 border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50",
    // Red Accent
    danger: "bg-white text-red-500 border-2 border-red-200 hover:bg-red-50 hover:border-red-400"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
    </button>
  );
};

export default Button;