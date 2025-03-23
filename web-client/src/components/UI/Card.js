import React from 'react';

const Card = ({ 
  children, 
  className = '',
  shadow = 'md',
  padding = 'md',
  border = false,
  rounded = 'md'
}) => {
  const baseStyles = 'bg-white';
  
  const shadowStyles = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };
  
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8'
  };
  
  const roundedStyles = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };
  
  const borderStyle = border ? 'border border-gray-200' : '';
  
  const cardClasses = `${baseStyles} ${shadowStyles[shadow]} ${paddingStyles[padding]} ${roundedStyles[rounded]} ${borderStyle} ${className}`;
  
  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
};

export default Card; 