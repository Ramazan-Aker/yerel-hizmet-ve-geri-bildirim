import React from 'react';

const Input = ({
  id,
  name,
  type = 'text',
  label,
  value,
  onChange,
  placeholder = '',
  error = '',
  required = false,
  disabled = false,
  className = '',
  ...rest
}) => {
  const baseInputStyles = 'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline';
  const errorInputStyles = 'border-red-500';
  const disabledStyles = disabled ? 'bg-gray-100 cursor-not-allowed' : '';
  
  const inputClasses = `${baseInputStyles} ${error ? errorInputStyles : ''} ${disabledStyles} ${className}`;
  
  return (
    <div className="mb-4">
      {label && (
        <label 
          className="block text-gray-700 text-sm font-bold mb-2" 
          htmlFor={id}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputClasses}
        {...rest}
      />
      {error && <p className="text-red-500 text-xs italic mt-1">{error}</p>}
    </div>
  );
};

export default Input;
