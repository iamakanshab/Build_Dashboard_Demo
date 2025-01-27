import React from 'react';

export function Alert({ className, variant = 'default', children, ...props }) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-900',
    destructive: 'bg-red-100 text-red-900',
  };

  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertDescription({ className, children, ...props }) {
  return (
    <div className={`text-sm ${className}`} {...props}>
      {children}
    </div>
  );
}