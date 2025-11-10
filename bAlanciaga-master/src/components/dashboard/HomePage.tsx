import { useNavigate } from "react-router-dom";
import Header from "../layout/Header";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0F0F0F] to-[#0A0A0A] text-white">
      <Header
        handleAgent={async () => {}}
        handleSendToAgent={async () => {}}
        isLoading={false}
        issend={false}
      />
      
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Eagle Finance
            </h1>
            <p className="text-xl text-gray-400 mb-6">
              Single-Sided Uniswap V3 Liquidity
            </p>
            
            {/* Main CTA */}
            <button
              onClick={() => navigate("/")}
              className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center gap-3">
                Create Position
                <span className="transform group-hover:translate-x-2 transition-transform text-2xl">→</span>
              </span>
            </button>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Vaults */}
            <button
              onClick={() => navigate("/vault")}
              className="group bg-[#111111] rounded-2xl p-6 border border-gray-800/40 shadow-xl shadow-black/50 hover:border-blue-500/50 transition-all hover:scale-105 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Vaults</h3>
              <p className="text-sm text-gray-400">Automated liquidity strategies</p>
            </button>

            {/* LP */}
            <button
              onClick={() => navigate("/lp")}
              className="group bg-[#111111] rounded-2xl p-6 border border-gray-800/40 shadow-xl shadow-black/50 hover:border-purple-500/50 transition-all hover:scale-105 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Liquidity Pool</h3>
              <p className="text-sm text-gray-400">Create LP positions</p>
            </button>

            {/* View */}
            <button
              onClick={() => navigate("/view")}
              className="group bg-[#111111] rounded-2xl p-6 border border-gray-800/40 shadow-xl shadow-black/50 hover:border-green-500/50 transition-all hover:scale-105 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-green-400 transition-colors">My Positions</h3>
              <p className="text-sm text-gray-400">View your portfolio</p>
            </button>
          </div>

          {/* Info Badges */}
          <div className="flex items-center justify-center gap-4 flex-wrap text-xs uppercase tracking-wider">
            <div className="px-4 py-2 bg-[#111111] rounded-full border border-gray-800/40 text-gray-400">
              Powered by Uniswap V3
            </div>
            <div className="px-4 py-2 bg-[#111111] rounded-full border border-gray-800/40 text-gray-400">
              Ethereum Mainnet
            </div>
            <div className="px-4 py-2 bg-[#111111] rounded-full border border-gray-800/40 text-gray-400">
              Audited Contracts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
