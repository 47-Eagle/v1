import React from 'react';

export function CharmBadge() {
  return (
    <a 
      href="https://charm.fi"
      target="_blank" 
      rel="noopener noreferrer"
      className="group flex items-center"
      title="Charm Finance"
    >
      <div className="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
        <img 
          src="https://teal-working-dormouse-113.mypinata.cloud/ipfs/bafkreid3difftzksqy3xlummzzobhk674ece35d7drmgo3ftt7wrix6dwu"
          alt="Charm Finance"
          className="w-full h-full object-contain"
        />
      </div>
    </a>
  );
}

