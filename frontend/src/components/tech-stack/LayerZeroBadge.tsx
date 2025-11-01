import React from 'react';

export function LayerZeroBadge() {
  return (
    <a 
      href="https://layerzero.network"
      target="_blank" 
      rel="noopener noreferrer"
      className="group flex items-center"
    >
      <div className="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
        <img 
          src="https://teal-working-dormouse-113.mypinata.cloud/ipfs/bafkreidhdvzrssoorwk2lbuasgz2ux2aak4azibxavevanrmmywl7mthve"
          alt="LayerZero"
          className="w-full h-full object-contain"
        />
      </div>
    </a>
  );
}

