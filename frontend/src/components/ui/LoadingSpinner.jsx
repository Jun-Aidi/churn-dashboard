import React from 'react';

export default function LoadingSpinner({ size = 32 }) {
  return (
    <div className="flex items-center justify-center w-full py-12">
      <div
        style={{
          width: size, height: size,
          border: '3px solid #e8e4da',
          borderTopColor: '#c9a84c',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
