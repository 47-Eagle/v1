import React from 'react';

export function LayerZeroBadge() {
  return (
    <a 
      href="https://layerzero.network"
      target="_blank" 
      rel="noopener noreferrer"
      className="group"
    >
      <div className="bg-white/40 shadow-neo-inset hover:shadow-neo-hover rounded-xl px-4 py-2 transition-all duration-300 border border-gray-200/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors font-medium">
            Omnichain via
          </span>
          <div className="w-4 h-4 flex items-center justify-center group-hover:scale-110 transition-transform">
            <img 
              src="https://teal-working-dormouse-113.mypinata.cloud/ipfs/bafkreidhdvzrssoorwk2lbuasgz2ux2aak4azibxavevanrmmywl7mthve"
              alt="LayerZero"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
    </a>
  );
}

