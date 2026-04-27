import React from 'react';

export default function Navbar({ title, subtitle, actions }) {
  return (
    <div className="flex justify-between items-start mb-7">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: '#8a8270', marginTop: 3, marginBottom: 0 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2.5">
          {actions}
        </div>
      )}
    </div>
  );
}
