import { BrowserRouter, Routes, Route } from "react-router-dom";
import Traditional from "./components/dashboard/Traditional";
import {
  DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { mainnet } from "viem/chains";
import { Provider } from "react-redux";
import store from "./store/index";
import View from "./components/view/View";
import Deposit from "./components/Deposit/Deposit";
import HomePage from "./components/dashboard/HomePage";
import Agent from "./components/dashboard/Agent";
import VaultPage from "./components/dashboard/VaultPage";
import LPPage from "./components/dashboard/LPPage";
function App() {
  const dynamicSettings = {
    environmentId: "1817ad15-5595-4a39-8b12-4893dfda3282",
    walletConnectors: [EthereumWalletConnectors],
    enableEnsLookup: true,
    evmNetworks: [
      {
        chainId: mainnet.id,
        chainName: "Ethereum",
        networkId: mainnet.id,
        nativeCurrency: {
          name: "Ethereum",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: [mainnet.rpcUrls.default.http[0]],
        blockExplorerUrls: [mainnet.blockExplorers.default.url],
      },
    ],
    defaultNetwork: mainnet.id,
    cssOverride: {
      colors: {
        primary: "#3B82F6",
        secondary: "#1D4ED8",
      },
    },
    siweStatement: `Welcome to Eagle Vault. Signing is the only way we can truly know that you are the owner of the wallet you are connecting. Signing is a safe, gas-less transaction that does not in any way give permission to perform any transactions with your wallet.`,
  };

  return (
    <Provider store={store}>
      <DynamicContextProvider settings={dynamicSettings}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Traditional />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/agent" element={<Agent />} />
            <Route path="/vault" element={<VaultPage />} />
            <Route path="/lp" element={<LPPage />} />
            <Route path="/view" element={<View />} />
            <Route path={`/vault/:vaultaddress`} element={<Deposit />} />
            <Route path="*" element={<div>not found</div>} />
          </Routes>
        </BrowserRouter>
      </DynamicContextProvider>
    </Provider>
  );
}

export default App;
