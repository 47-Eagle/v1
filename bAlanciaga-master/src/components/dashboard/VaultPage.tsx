import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../../utils/setting";
import Header from "../layout/Header";

interface Vault {
  vaultAddress: string;
  poolAddress: string;
  name: string;
  symbol: string;
  baseToken: string;
  quoteToken: string;
  chain: number;
}

const VaultPage = () => {
  const navigate = useNavigate();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVaults();
  }, []);

  const fetchVaults = async () => {
    try {
      const response = await axios.get(`${URL}/vaults`);
      if (response.data) {
        setVaults(response.data);
      }
    } catch (error) {
      console.error("Error fetching vaults:", error);
      // Set empty array if API fails
      setVaults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVaultClick = (vaultAddress: string) => {
    navigate(`/vault/${vaultAddress}`);
  };

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
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Eagle Vaults
            </h1>
            <p className="text-xl text-gray-400 mb-2">
              Auto-Rebalancing Uniswap V3 Liquidity Vaults
            </p>
            <p className="text-sm text-gray-500">
              Single-sided deposits with IL advantage strategies
            </p>
          </div>

          {/* Create New Vault Button */}
          <div className="max-w-2xl mx-auto mb-8">
            <button
              onClick={() => navigate("/traditional")}
              className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-500 hover:via-blue-400 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70"
            >
              + Create New Vault
            </button>
          </div>

          {/* Vaults Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : vaults.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-500 text-lg mb-4">No vaults found</div>
              <p className="text-gray-600 text-sm mb-6">
                Create your first vault to get started
              </p>
              <button
                onClick={() => navigate("/traditional")}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
              >
                Create Vault
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vaults.map((vault) => (
                <div
                  key={vault.vaultAddress}
                  onClick={() => handleVaultClick(vault.vaultAddress)}
                  className="bg-[#111111] rounded-2xl p-6 border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl font-bold text-blue-400">
                      {vault.symbol}
                    </div>
                    <div className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-semibold">
                      Active
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 mb-4">{vault.name}</div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vault Address:</span>
                      <span className="text-gray-300 font-mono text-xs">
                        {vault.vaultAddress.slice(0, 6)}...
                        {vault.vaultAddress.slice(-4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chain:</span>
                      <span className="text-gray-300">
                        {vault.chain === 0 ? "Ethereum" : "Base"}
                      </span>
                    </div>
                  </div>

                  <button className="w-full mt-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-semibold py-2 rounded-xl transition-all duration-300">
                    Manage Vault
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-[#111111] rounded-2xl p-6 border border-gray-800/50">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="text-lg font-bold mb-2 text-blue-400">
                Auto-Rebalancing
              </h3>
              <p className="text-sm text-gray-400">
                Vaults automatically rebalance to maintain optimal liquidity
                ranges
              </p>
            </div>

            <div className="bg-[#111111] rounded-2xl p-6 border border-gray-800/50">
              <div className="text-3xl mb-2">💎</div>
              <h3 className="text-lg font-bold mb-2 text-purple-400">
                Single-Sided
              </h3>
              <p className="text-sm text-gray-400">
                Deposit only one token, earn from both sides of the pair
              </p>
            </div>

            <div className="bg-[#111111] rounded-2xl p-6 border border-gray-800/50">
              <div className="text-3xl mb-2">📈</div>
              <h3 className="text-lg font-bold mb-2 text-pink-400">
                IL Advantage
              </h3>
              <p className="text-sm text-gray-400">
                Strategic positioning to minimize impermanent loss
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultPage;

