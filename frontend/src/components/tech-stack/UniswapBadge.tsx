import React from 'react';

export function UniswapBadge() {
  return (
    <a 
      href="https://uniswap.org"
      target="_blank" 
      rel="noopener noreferrer"
      className="group flex items-center"
      title="Uniswap V3"
    >
      <div className="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
        <img 
          src="https://teal-working-dormouse-113.mypinata.cloud/ipfs/bafkreig3ynkhtw76tekx6lhp7po3xbfy54lg3pvcvvi3mlyhghmzavmlu4"
          alt="Uniswap"
          className="w-full h-full object-contain"
        />
      </div>
    </a>
  );
}

