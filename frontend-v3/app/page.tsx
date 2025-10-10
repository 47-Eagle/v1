'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import DepositInterface from '@/components/DepositInterface';
import WithdrawalInterface from '@/components/WithdrawalInterface';
import VaultAnalytics from '@/components/VaultAnalytics';
import UserPosition from '@/components/UserPosition';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'analytics'>('analytics');

  return (
    <main className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🦅</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Eagle Vault V3
                </h1>
                <p className="text-sm text-gray-600">Chainlink Oracle Powered</p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Oracle-Powered Dual-Token Vault
            </h2>
            <p className="text-xl text-purple-100 max-w-3xl mx-auto">
              Deposit WLFI and USD1 with accurate USD valuation using Chainlink and Uniswap V3 TWAP oracles.
              Earn yield through automated strategy deployment.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <p className="text-sm text-purple-200">Oracle Pricing</p>
                <p className="text-2xl font-bold">Chainlink + TWAP</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <p className="text-sm text-purple-200">Standard</p>
                <p className="text-2xl font-bold">ERC-4626</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <p className="text-sm text-purple-200">Max Strategies</p>
                <p className="text-2xl font-bold">5</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-2xl shadow-lg p-2 inline-flex gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'deposit'
                ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            💰 Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'withdraw'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            💸 Withdraw
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            {activeTab === 'analytics' && (
              <div className="animate-fadeIn">
                <VaultAnalytics />
              </div>
            )}
            {activeTab === 'deposit' && (
              <div className="animate-fadeIn">
                <DepositInterface />
              </div>
            )}
            {activeTab === 'withdraw' && (
              <div className="animate-fadeIn">
                <WithdrawalInterface />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="animate-fadeIn">
              <UserPosition />
            </div>

            {/* Quick Links */}
            <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🔗</span> Quick Links
              </h3>
              <div className="space-y-3">
                <a
                  href="https://arbiscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <p className="font-medium text-blue-900">View on Arbiscan</p>
                  <p className="text-xs text-blue-600">Verify contract & transactions</p>
                </a>
                <a
                  href="https://docs.chain.link/data-feeds"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <p className="font-medium text-purple-900">Chainlink Docs</p>
                  <p className="text-xs text-purple-600">Learn about price feeds</p>
                </a>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
              <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <span>🔒</span> Security
              </h3>
              <p className="text-sm text-amber-800">
                Smart contracts use battle-tested OpenZeppelin libraries and are secured with
                reentrancy guards. Oracle prices verified through multiple sources.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">🦅</span>
                <span className="text-xl font-bold">Eagle Vault V3</span>
              </div>
              <p className="text-gray-400 text-sm">
                Oracle-powered vault with Chainlink and Uniswap TWAP integration for accurate
                dual-token valuation.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>✅ Chainlink Price Feeds</li>
                <li>✅ Uniswap V3 TWAP Oracle</li>
                <li>✅ ERC-4626 Standard</li>
                <li>✅ Multi-Strategy Support</li>
                <li>✅ Instant Withdrawals</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Audit Reports
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Community Discord
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>© 2025 Eagle Vault V3. Built with Chainlink and Uniswap V3 oracles.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

