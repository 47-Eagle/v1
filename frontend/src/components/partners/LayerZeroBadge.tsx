import React from 'react';

export function LayerZeroBadge() {
  return (
    <a 
      href="https://layerzero.network"
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center gap-2 hover:text-gray-900 transition-colors group"
    >
      <span className="font-medium text-gray-600 group-hover:text-gray-900">Omnichain via</span>
      <div className="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
        <img 
          src="https://teal-working-dormouse-113.mypinata.cloud/ipfs/bafkreihml3nahd2duwdjg2ltoeixax2xdj2ldp5unnrjwntyicar74nwra"
          alt="LayerZero"
          className="w-full h-full object-contain"
        />
      </div>
    </a>
  );
}

