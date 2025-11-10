import { useNavigate } from "react-router-dom";
import Header from "../layout/Header";

const LPPage = () => {
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
        <div className="max-w-6xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Eagle LP
            </h1>
            <p className="text-xl text-gray-400 mb-2">
              Single-Sided Uniswap V3 Liquidity
            </p>
            <p className="text-sm text-gray-500">
              Deploy one token, earn from both sides
            </p>
          </div>

          {/* Strategy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            {/* Create New Position */}
            <div
              onClick={() => navigate("/traditional")}
              className="group bg-[#111111] rounded-3xl p-8 border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                ✨
              </div>
              <h2 className="text-2xl font-bold mb-3 text-blue-400 group-hover:text-blue-300">
                Create New Position
              </h2>
              <p className="text-gray-400 mb-4">
                Deploy single-sided liquidity with automated rebalancing and IL
                advantage strategies
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-300">Auto-rebalancing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-300">Single token deposit</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-300">Minimize IL risk</span>
                </div>
              </div>
              <div className="mt-6 px-4 py-2 bg-blue-600/10 group-hover:bg-blue-600/20 text-blue-400 rounded-xl text-center font-semibold transition-all">
                Get Started →
              </div>
            </div>

            {/* View Existing Positions */}
            <div
              onClick={() => navigate("/view")}
              className="group bg-[#111111] rounded-3xl p-8 border border-gray-800/50 hover:border-purple-500/50 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                📊
              </div>
              <h2 className="text-2xl font-bold mb-3 text-purple-400 group-hover:text-purple-300">
                View Positions
              </h2>
              <p className="text-gray-400 mb-4">
                Monitor and manage your existing liquidity positions across all
                pools
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-gray-300">Track performance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-gray-300">View fees earned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-gray-300">Manage liquidity</span>
                </div>
              </div>
              <div className="mt-6 px-4 py-2 bg-purple-600/10 group-hover:bg-purple-600/20 text-purple-400 rounded-xl text-center font-semibold transition-all">
                View Portfolio →
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-300">
              Why Eagle LP?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#111111] rounded-2xl p-6 border border-gray-800/50">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg shadow-blue-500/30">
                  🎯
                </div>
                <h3 className="text-lg font-bold mb-2 text-blue-400">
                  Concentrated Liquidity
                </h3>
                <p className="text-sm text-gray-400">
                  Leverage Uniswap V3's concentrated liquidity for maximum
                  capital efficiency and higher returns
                </p>
              </div>

              <div className="bg-[#111111] rounded-2xl p-6 border border-gray-800/50">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg shadow-purple-500/30">
                  🤖
                </div>
                <h3 className="text-lg font-bold mb-2 text-purple-400">
                  Smart Automation
                </h3>
                <p className="text-sm text-gray-400">
                  Our agents automatically rebalance your positions to keep them
                  in range and maximize fees
                </p>
              </div>

              <div className="bg-[#111111] rounded-2xl p-6 border border-gray-800/50">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg shadow-pink-500/30">
                  💰
                </div>
                <h3 className="text-lg font-bold mb-2 text-pink-400">
                  Fee Optimization
                </h3>
                <p className="text-sm text-gray-400">
                  Strategic positioning to capture maximum trading fees while
                  managing impermanent loss
                </p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="max-w-4xl mx-auto mt-12 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-3xl p-8 border border-blue-500/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">
                  1%
                </div>
                <div className="text-sm text-gray-400">Fee Tier</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">
                  24/7
                </div>
                <div className="text-sm text-gray-400">
                  Automated Management
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-pink-400 mb-2">
                  V3
                </div>
                <div className="text-sm text-gray-400">
                  Uniswap Protocol
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="max-w-4xl mx-auto mt-12">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-300">
              How It Works
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-blue-400">
                    Select Your Token
                  </h3>
                  <p className="text-gray-400">
                    Choose any token to provide liquidity. You only need one
                    token to start.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/30">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-purple-400">
                    Set Your Amount
                  </h3>
                  <p className="text-gray-400">
                    Enter the amount you want to deploy. Our system will
                    optimize the position for you.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-pink-500/30">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-pink-400">
                    Earn Automatically
                  </h3>
                  <p className="text-gray-400">
                    Sit back and watch your position earn fees. Our agents
                    handle rebalancing automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <button
              onClick={() => navigate("/traditional")}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-500/50 hover:shadow-purple-500/70 text-lg"
            >
              Start Providing Liquidity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LPPage;

