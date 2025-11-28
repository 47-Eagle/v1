import { useAuth, GoogleAuthLogin } from '../lib/GoogleAuth';

// Authorized wallet addresses
const AUTHORIZED_WALLETS = [
  '0xc7027dACCa23C029e6EAfCD6C027f1124cF48F07', // AC
  '0xEdA067447102cb38D95e14ce99fe21D55C27152D', // AKITA, LLC
  '0x4711068C4030d58F494705c4b1DD63c5237A7733', // Slynapes
  '0x5A29149bE2006A6dADAaC43F42704551FD4f8140', // SirJigs
  '0x58f7EE4150A4cb484d93a767Bf6d9d7DDb468771', // Vince
  '0x7310Dd6EF89b7f829839F140C6840bc929ba2031', // Deployer
].map(addr => addr.toLowerCase());

interface Props {
  children: React.ReactNode;
  walletAddress?: string;
  isWalletConnected?: boolean;
  onBack?: () => void;
}

export default function AdminAuth({ children, walletAddress, isWalletConnected, onBack }: Props) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  // Check if wallet is authorized
  const isWalletAuthorized = isWalletConnected && walletAddress && 
    AUTHORIZED_WALLETS.includes(walletAddress.toLowerCase());

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-eagle-gold/20 border-t-eagle-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Allow access if either Google authenticated OR authorized wallet connected
  if (!isAuthenticated && !isWalletAuthorized) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <div className="bg-[#0a0a0a]/60 backdrop-blur-lg border border-eagle-gold/30 rounded-3xl p-10 max-w-lg w-full relative">
          
          {/* Close button */}
          {onBack && (
            <button
              onClick={onBack}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              title="Go back"
            >
              ×
            </button>
          )}
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-3">Admin Access</h2>
            <p className="text-gray-400">Authentication required to continue</p>
          </div>

          {/* Google Auth Option */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 text-center mb-4">Option 1: Google Authentication</p>
            <div className="flex justify-center">
              <GoogleAuthLogin />
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">Only @47eagle.com accounts</p>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0a0a0a] px-2 text-gray-500">OR</span>
            </div>
          </div>

          {/* Wallet Auth Status */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 text-center mb-4">Option 2: Authorized Wallet</p>
            {isWalletConnected && walletAddress ? (
              <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                    <p className="text-sm font-mono text-white">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${isWalletAuthorized ? 'bg-green-400' : 'bg-red-400'}`}></div>
                </div>
                <p className={`text-xs mt-2 ${isWalletAuthorized ? 'text-green-400' : 'text-red-400'}`}>
                  {isWalletAuthorized ? '✓ Authorized' : '✗ Not authorized'}
                </p>
              </div>
            ) : (
              <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 text-center">
                <p className="text-sm text-gray-400">No wallet connected</p>
                <p className="text-xs text-gray-500 mt-1">Connect an authorized wallet to access</p>
              </div>
            )}
          </div>

          {onBack && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <button
                onClick={onBack}
                className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors text-sm"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show authenticated content
  return (
    <>
      {/* Auth Status Banner */}
      <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          {isAuthenticated && user?.picture ? (
            <img 
              src={user.picture} 
              alt={user.name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-green-400">Authenticated</div>
            <div className="text-xs text-gray-400">
              {isAuthenticated && user ? (
                <>{user.name} ({user.email})</>
              ) : (
                <>Wallet: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</>
              )}
            </div>
          </div>
        </div>
        {isAuthenticated && (
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>
      {children}
    </>
  );
}

