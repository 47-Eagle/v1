import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  txHash?: string;
  onClose: () => void;
}

export default function Toast({ message, type = 'info', txHash, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500/20 border-green-500/30' : 
                  type === 'error' ? 'bg-red-500/20 border-red-500/30' : 
                  'bg-indigo/20 border-indigo/30';

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'i';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className={`${bgColor} border backdrop-blur-lg rounded-xl p-4 shadow-2xl min-w-[320px]`}>
        <div className="flex items-start gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-indigo text-white'
          }`}>
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">{message}</p>
            {txHash && (
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-eagle-gold hover:text-eagle-gold-light mt-1 inline-flex items-center gap-1"
              >
                View on Etherscan
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

