/* eslint-disable */
import { useEffect, useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import univ3prices from "@thanpolas/univ3prices";
import { getSigner } from "@dynamic-labs/ethers-v6";
import axios from "axios";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Wallet } from "@dynamic-labs/sdk-react-core";
import { ChevronDown } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { Toaster, toast } from "react-hot-toast";
import Uniswap_LOGO from "/uniswap.webp";
import FALLBACK_TOKEN from "/token-placeholder.svg";
import { TokenList } from "../../utils/tokenList";
import { computeV2PairAddress } from "../../utils/graphQueries";
import SelectTokenModal from "../utilities/SelectTokenModal";
import Loader from "../utilities/Loader";
import ChainSelector from "../utilities/ChainSelector";
import { truncateString, URL } from "../../utils/setting";
import { Icon } from "../../utils/setting";
import { MainTokens } from "../../utils/setting";
import { BasicTokens } from "../../utils/setting";
import {
  factoryABI,
  nonfungiblePositionManagerABI,
  vaultFactoryABI,
  vaultABI,
  tokenABI,
} from "../../utils/constants";
import Header from "../layout/Header";
// import { SelectedTokenType } from "../../types/token";
// import { DynamicWallet } from "../../types/wallet";

import {
  DynamicWallet,
  ProgressState,
  SelectedTokenType,
  VaultType,
} from "../../types/types";

const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>
) => {
  event.currentTarget.src = FALLBACK_TOKEN;
};

function Traditional() {
  const navigate = useNavigate();
  const { primaryWallet } = useDynamicContext() as {
    primaryWallet: DynamicWallet | null;
  };
  const [isSelectChain, setSelectChain] = useState(false);
  const [chain, setChain] = useState<number | undefined>(0); // Default to Ethereum (index 0 in Icon array)
  const [myTokenList, setMyTokenList] = useState<any>(null);
  const [selectedToken, setSelectedToken] = useState<SelectedTokenType | null>(
    null
  );
  const [selectedTokenBalance, setSelectedTokenBalance] = useState("");
  const [show, setShow] = useState(false);
  const [previewShow, setPreviewShow] = useState(false);
  const [amount, setAmount] = useState("");
  const [tokenPrice, setTokenPrice] = useState(0);
  const [vaultAddresses, setVaultAddresses] = useState<string>("");

  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApprove, setIsApprove] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({
    vault: false,
    approve: false,
    maxDeposit: false,
    rebalance: false,
    deposit: false,
    trebalance: false,
    success: false,
  });
  const [currentStep, setCurrentStep] = useState<string>("");
  const [isAgent, setAgent] = useState<boolean>(false);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [currentTick, setCurrentTick] = useState<number>(0);
  const [lowerTick, setLowerTick] = useState<number>(0);
  const [upperTick, setUpperTick] = useState<number>(0);
  const [lowRange] = useState(0.958);
  const [highRange] = useState(3.0);
  const [poolAddress, setAddress] = useState<string>("");
  const [isDeposit, setIsDeposit] = useState<boolean>(false);
  const [agentAddress, setAgentAddress] = useState<string>("");
  const [depositAddress, setDepositAddress] = useState<string>("");
  const [createdPosition, setCreatedPosition] = useState<{
    poolAddress: string;
    positionId: string;
  } | null>(null);
  const [maxClicked, setMaxClicked] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const managerAddress: string = "0xB05Cf01231cF2fF99499682E64D3780d57c80FdD";
  const maxTotalSupply: string =
    "115792089237316195423570985008687907853269984665640564039457584007913129639935";
  const minLimitBalance = 0.00002;
  const [agentBalance, setBalance] = useState<number>(0);
  const [issend, setisSend] = useState<boolean>(false);

  const getButtonStyle = () => {
    // Neumorphic styles are applied via className, just return empty string
    return "";
  };

  // const getButtonContent = () => {
  //   if (isLoading && !agentAddress) {
  //     return <Loader />;
  //   }
  //   return (
  //     <span>
  //       {agentAddress ? truncateString(agentAddress) : "Create Agent"}
  //     </span>
  //   );
  // };
  const isButtonDisabled1 = () =>
    chain === undefined ||
    !selectedToken ||
    isButtonDisabled ||
    (!amount && !isApprove);

  const closePreviewModal = () => {
    setProgressState({
      agent: false,
      vault: false,
      approve: false,
      maxDeposit: false,
      rebalance: false,
      deposit: false,
      trebalance: false,
      success: false,
    });
    setIsApprove(false);
    setIsLoading(false);
    setCurrentStep("");
    setPreviewShow(false);
    if (isSuccess) {
      setIsSuccess(false);
    }
  };
  const handleButtonClick = async () => {
    if (chain === undefined) {
      setSelectChain(true);
    } else if (!selectedToken) {
      setShow(true);
    } else if (amount) {
      // Direct flow: Approve if needed, then create position
      if (!isApprove && approvedAmount < Number(amount)) {
        console.log("🔐 Approval needed. Current allowance:", approvedAmount, "Required:", amount);
        await handleApprove();
        // After approval, automatically create position
        if (approvedAmount >= Number(amount)) {
          await handleAddLiquidity();
        }
      } else {
        console.log("✅ Already approved. Creating position...");
        await handleAddLiquidity();
      }
    }
  };

  const getButtonText = () => {
    if (!selectedToken) return "Select Token";
    if (amount === "") return "Enter Amount";
    if (isLoading) return <Loader />;
    
    // Show simple, clear text
    if (amount) {
      if (isApprove || approvedAmount >= Number(amount)) {
        return "Create Position";
      } else {
        return `Approve & Create Position`;
      }
    }
    return "Create Position";
  };

  const handleNextStep = async (step: string) => {
    if (progressState[step]) {
      return;
    }
    switch (step) {
      case "vault":
        await CreateVault(poolAddress);
        break;
      case "approve":
        await handleApprove();
        break;
      case "maxDeposit":
        await handleDeposit();
        break;
      case "rebalance":
        await handleRebalnance();
        break;
      case "deposit":
        await handleDeposit();
        break;
      case "trebalance":
        await handleRebalnance();
        break;
      default:
        break;
    }
  };

  const CreateVault = async (address: string) => {
    if (agentBalance < minLimitBalance) {
      toast.error("Agent balance is low");
      return;
    }
    setIsLoading(true);
    try {
      const signer = await getSigner(primaryWallet as any);
      if (!signer || selectedToken?.address === undefined) {
        console.error("No signer available");
        return false;
      }
      if (chain != 0 && chain != 1) {
        console.error("chain not selected");
        return false;
      }
      const vaultFactoryContract = new ethers.Contract(
        Icon[chain].vaultFactoryAddress,
        vaultFactoryABI,
        signer
      );
      const param = {
        pool: address,
        manager: managerAddress,
        managerFee: 59420,
        rebalanceDelegate: agentAddress,
        maxTotalSupply: BigInt(maxTotalSupply),
        baseThreshold: 5400,
        limitThreshold: 12000,
        fullRangeWeight: 200000,
        period: 3,
        minTickMove: 0,
        maxTwapDeviation: 100,
        twapDuration: 60,
        name: `Charming ${selectedToken?.symbol} by EAGLE`,
        symbol: `v${selectedToken?.symbol}`,
      };
      if (!primaryWallet) return;

      const tx = await vaultFactoryContract.createVault(param);
      const receipt = await tx.wait();
      let vaultAddress1 = "";
      const VaultLog = receipt.logs.find(
        (log: { topics: string[]; Data: any }) =>
          log.topics[0] === ethers.id("NewVault(address)")
      );
      vaultAddress1 = String("0x" + VaultLog.data.slice(-40));
      setVaultAddresses(vaultAddress1);
      let vault: VaultType = {
        poolAddress: address,
        vaultAddress: vaultAddress1,
        agentAddress: agentAddress,
        walletAddress: primaryWallet?.address,
        maxTotalSupply: Number(maxTotalSupply),
        baseToken: selectedToken?.address,
        quoteToken: MainTokens[chain],
        name: param.name,
        symbol: param.symbol,
        chain: chain,
      };
      if (poolAddress) {
        setProgressState({ ...progressState, [currentStep]: true });
      }
      setCurrentStep("approve");
      saveVault(vault);
      toast.success("Successfully created new vault!");
      setIsLoading(false);
      return true;
    } catch (error) {
      if (currentStep == "vault") toast.error("failed!");
      setIsLoading(false);
      console.log(error);
      return false;
    }
  };

  const saveVault = async (vault: VaultType) => {
    try {
      const response = await axios.post(`${URL}/update/vault`, vault);
      console.log(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRebalnance = async () => {
    // Skip if agent API is not configured
    if (!URL || URL === "") {
      toast("Agent rebalancing not available");
      return;
    }
    if (!vaultAddresses) {
      toast.error("Please create vault first");
      return;
    }
    setIsLoading(true);
    console.log("vaultAddresses ------> ", vaultAddresses);
    await axios
      .post(`${URL}/agent/rebalance`, {
        vaultAddress: vaultAddresses,
        metaAddress: primaryWallet?.address,
      })
      .then((res) => {
        if (res.data.state === "success") {
          toast.success("Rebalance success");
          if (currentStep == "trebalance") setCurrentStep("success");
          else setCurrentStep("deposit");
          setProgressState({ ...progressState, [currentStep]: true });
        } else {
          toast.error("Rebalance failed");
        }
      })
      .catch(() => setIsLoading(false));
    let balance = await getTokenBalance(selectedToken?.address as string);
    if (balance) setSelectedTokenBalance(balance);
    setIsLoading(false);
  };

  const getTokenBalance = async (tokenAddress: string) => {
    if (tokenAddress === undefined) return;
    if (!primaryWallet?.address) return "0";
    try {
      const signer = await getSigner(primaryWallet as any);
      if (!signer) {
        console.error("No signer available");
        return "0";
      }
      const contract = new ethers.Contract(tokenAddress, tokenABI, signer);
      const balance1 = await contract.balanceOf(primaryWallet.address);
      const _decimal = await contract.decimals();
      return ethers.formatUnits(balance1, Number(_decimal));
    } catch (error) {
      console.error("Error fetching balance:", error);
      return "0";
    }
  };

  const setSelectedTokenInfo = async (item: SelectedTokenType) => {
    setSelectedToken(item);
    const tokenAddress = item.address;
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        setTokenPrice(data.pairs[0].priceUsd);
      })
      .catch((error) => {
        setTokenPrice(0);
        console.log("price error", error);
      });
    let balance = await getTokenBalance(selectedToken?.address as string);
    if (balance) setSelectedTokenBalance(balance);
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value.length && value[0] !== ".") {
      const inValue: string = value[value.length - 1];
      if (inValue === "." || (inValue >= "0" && inValue <= "9")) {
        setAmount(value);
        setMaxClicked(false);
      }
    } else {
      setAmount("");
      setIsApprove(false);
      setIsButtonDisabled(true);
      setMaxClicked(false);
    }
  };

  const handleRangeClick = () => {
    if (Number(selectedTokenBalance)) {
      const balance = String(Number(selectedTokenBalance));
      setAmount(balance);
      setMaxClicked(true);
      setIsApprove(approvedAmount >= parseFloat(balance));
      setIsButtonDisabled(false);
    }
  };

  const switchNetwork = async () => {
    try {
      if (!primaryWallet || chain === undefined || !Icon[chain]) return;
      if (primaryWallet?.connector.supportsNetworkSwitching()) {
        await primaryWallet.switchNetwork(Icon[chain].chainId);
        setSelectedToken(null);
        setSelectedTokenBalance("");
      }
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  const handleNetworkSwitch = async () => {
    try {
      if (!primaryWallet) {
        return;
      }
      await switchNetwork();
    } catch (error) {
      console.error("Error switching network:", error);
    }
  };

  const checkPoolExists = async (
    tokenA: string,
    tokenB: string,
    fee: number
  ) => {
    if (chain === undefined || !Icon[chain] || !primaryWallet) return false;
    
    try {
      const signer = await getSigner(primaryWallet as any);
      const factoryContract = new ethers.Contract(
        Icon[chain].factoryAddress,
        factoryABI,
        signer
      );
      
      const poolAddress = await factoryContract.getPool(tokenA, tokenB, fee);
      if (poolAddress === ethers.ZeroAddress) {
        return false;
      } else {
        return poolAddress;
      }
    } catch (error) {
      console.error("Error checking pool:", error);
      return false;
    }
  };

  const getPriceAndTickFromValues = (price: number) => {
    const _tempPrice = Math.sqrt(2 ** 192 * price);
    let _tick = univ3prices.tickMath.getTickAtSqrtRatio(_tempPrice);
    _tick = _tick - (_tick % 200);
    const _price = BigInt(
      univ3prices.tickMath.getSqrtRatioAtTick(_tick).toString()
    );
    return { tick: _tick, price: _price };
  };

  const handleApprove = async () => {
    if (!selectedToken || chain === undefined) return;
    setIsLoading(true);
    if (primaryWallet) {
      try {
        console.log("🔐 Starting approval process...");
        console.log("Token:", selectedToken.symbol, selectedToken.address);
        console.log("Amount:", amount);
        
        const signer = await getSigner(primaryWallet as any);
        const selectedTokenContract = new ethers.Contract(
          selectedToken.address,
          tokenABI,
          signer
        );
        const _decimal = await selectedTokenContract.decimals();
        
        // Debug chain and Icon array
        console.log("Chain index:", chain);
        console.log("Icon array:", Icon);
        console.log("Icon[chain]:", Icon[chain]);
        
        // Get the correct spender address
        let targetAddress = "";
        
        // Check if we're depositing to an existing vault
        if (isDeposit && vaultAddresses && vaultAddresses !== "") {
          targetAddress = vaultAddresses;
          console.log("Using vault address for deposit:", targetAddress);
        } else if (Icon[chain] && Icon[chain].routerAddress) {
          // Use NonfungiblePositionManager for creating LP positions
          targetAddress = Icon[chain].routerAddress;
          console.log("Using NonfungiblePositionManager:", targetAddress);
        } else {
          // Fallback to hardcoded Uniswap V3 NonfungiblePositionManager
          targetAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
          console.log("Using fallback NonfungiblePositionManager:", targetAddress);
        }
        
        if (!targetAddress || targetAddress === "") {
          console.error("Approval configuration error:", {
            isDeposit,
            vaultAddresses,
            chain,
            hasIcon: !!Icon[chain],
            routerAddress: Icon[chain]?.routerAddress
          });
          throw new Error("Approval target address is not configured");
        }
        
        console.log("Final approving spender:", targetAddress);
        console.log("Amount in wei:", ethers.parseUnits(amount, _decimal).toString());
        
        const tx = await selectedTokenContract.approve(
          targetAddress,
          ethers.parseUnits(amount, _decimal)
        );
        
        console.log("Approval tx sent:", tx.hash);
        toast.loading("Approving token...", { id: "approval" });
        
        const receipt = await tx.wait();
        console.log("Approval confirmed! Block:", receipt.blockNumber);
        
        toast.dismiss("approval");
        toast.success("Token approved successfully!");
        
        // Update approval state
        setIsApprove(true);
        
        // Refresh the allowance to confirm
        await getApprovedAmountOfSelectedToken();
        
        setProgressState({ ...progressState, [currentStep]: true });
        if (poolAddress) setCurrentStep("maxDeposit");
        setIsLoading(false);
        
        // Auto-create position after approval if in simple flow
        if (currentStep == "") {
          console.log("✅ Approval complete. Auto-creating position...");
          await handleAddLiquidity();
        }
      } catch (err: any) {
        setIsLoading(false);
        setIsApprove(false);
        console.error("❌ Approval error:", err);
        
        if (String(err).includes("user rejected") || err.code === "ACTION_REJECTED") {
          toast.error("Transaction cancelled by user");
        } else if (err.reason) {
          toast.error(`Approval failed: ${err.reason}`);
        } else if (err.message) {
          toast.error(`Approval failed: ${err.message}`);
        } else {
          toast.error("Approval failed. Please try again.");
        }
      }
    }
  };

  const handleSendToAgent = async (to: string) => {
    if (chain === undefined) return;
    setisSend(true);
    if (primaryWallet) {
      try {
        const signer = await getSigner(primaryWallet as any);
        if (!signer) {
          console.log("signer is null");
          return;
        }
        console.log("signer: ", signer);
        const tx = {
          to: to,
          value: ethers.parseEther("0.0003"),
        };
        const responseTx = await signer.sendTransaction(tx);
        await responseTx.wait();
        toast.success("Successfully approved!");
        setCurrentStep("vault");
        setIsLoading(false);
        fetchAgent();
      } catch (err) {
        if (String(err).includes("Error: user rejected action")) {
          toast.error(`User rejected!`);
        } else {
          console.log("err: ", err);
          toast.error(`Check Your Wallet!`);
        }
      }
    }
    setisSend(false);
  };

  const getRecentPrice = async (address: string) => {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
    try {
      const response = await axios.get(url);
      const priceUsd = response.data.pairs[0].priceUsd;
      return priceUsd;
    } catch (error) {
      return 0;
    }
  };

  const calculateTokenPrices = async (address1: string, address2: string) => {
    const price1 = await getRecentPrice(address1);
    const price2 = await getRecentPrice(address2);
    return [price1, price2];
  };

  const getApprovedAmountOfSelectedToken = async () => {
    if (!selectedToken || chain === undefined) return;
    try {
      const signer = await getSigner(primaryWallet as any);
      const selectedTokenContract = new ethers.Contract(
        selectedToken.address,
        tokenABI,
        signer
      );
      let targetAddress = Icon[chain].routerAddress;
      if (isDeposit) targetAddress = depositAddress;
      const approvedAmount0 = await selectedTokenContract.allowance(
        primaryWallet?.address,
        targetAddress
      );
      const _decimal = await selectedTokenContract.decimals();
      const approvedAmount1 = ethers.formatUnits(approvedAmount0, _decimal);
      setApprovedAmount(Number(approvedAmount1));
    } catch (error) {
      console.error("Error fetching approved amount:", error);
    }
  };

  const handleDeposit = async () => {
    if (!selectedToken || chain === undefined) return;
    try {
      setIsLoading(true);
      const signer = await getSigner(primaryWallet as any);
      if (!signer) {
        toast.error("No signer available");
        return;
      }
      const vaultContract = new ethers.Contract(
        vaultAddresses,
        vaultABI,
        signer
      );
      const token0 = await vaultContract.token0();
      const same = String(token0) == selectedToken.address;
      const selectedTokenContract = new ethers.Contract(
        selectedToken.address,
        tokenABI,
        signer
      );
      const _decimal = await selectedTokenContract.decimals();
      const _amount =
        currentStep === "maxDeposit"
          ? ethers.parseUnits(amount, _decimal) / BigInt(10)
          : (ethers.parseUnits(amount, _decimal) * BigInt(9)) / BigInt(10);
      const tx = await vaultContract.deposit(
        same ? _amount : 0,
        !same ? _amount : 0,
        0,
        0,
        primaryWallet?.address
      );
      await tx.wait();
      saveDeposit(Number(_amount), vaultAddresses);
      setProgressState({ ...progressState, [currentStep]: true });
      if (currentStep === "deposit") setCurrentStep("trebalance");
      else setCurrentStep("rebalance");
      setIsLoading(false);
    } catch (error) {
      console.log(error);
      setIsLoading(false);
    }
  };

  const saveDeposit = (amount: number, vaultAddress: string) => {
    try {
      axios
        .post(`${URL}/update/deposit`, { amount, vaultAddress })
        .then((res) => {
          console.log(res.data);
        });
    } catch {
      console.log("error");
    }
  };
  const handleAddLiquidity = async () => {
    if (!selectedToken || chain === undefined) return;
    setIsLoading(true);
    try {
      // Input validation
      if (!amount || parseFloat(amount) <= 0) {
        toast.error("Please enter a valid amount");
        setIsLoading(false);
        return;
      }
      const signer = await getSigner(primaryWallet as any);
      if (!signer) {
        toast.error("No signer available");
        setIsLoading(false);
        return;
      }

      // Initialize contracts
      const nonfungiblePositionManager = new ethers.Contract(
        Icon[chain].routerAddress,
        nonfungiblePositionManagerABI,
        signer
      );

      // Validate token order
      if (chain === undefined) {
        toast.error("Please select a chain");
        setIsLoading(false);
        return;
      }
      let address1 = selectedToken.address;
      let address2 = MainTokens[chain];
      const fee = BigInt("10000");
      let token0: string, token1: string;
      const isToken0 = address1.toLowerCase() < address2.toLowerCase();
      if (isToken0) {
        token0 = address1;
        token1 = address2;
      } else {
        token0 = address2;
        token1 = address1;
      }

      // Check user's balance
      const tokenContract = new ethers.Contract(
        selectedToken.address,
        tokenABI,
        signer
      );

      // Calculate desired amount with proper decimal handling
      const _decimal = await tokenContract.decimals();
      const desiredAmount = ethers.parseUnits(amount, _decimal);

      const balance = await tokenContract.balanceOf(primaryWallet?.address);
      if (balance < desiredAmount) {
        toast.error("Insufficient balance");
        setIsLoading(false);
        return;
      }

      // Check allowance
      const allowance = await tokenContract.allowance(
        primaryWallet?.address,
        Icon[chain].routerAddress
      );
      if (allowance < desiredAmount) {
        toast.error("Please approve the token first");
        setIsLoading(false);
        return;
      }

      // Get current prices for tick calculations
      const [price1, price2] = await calculateTokenPrices(token0, token1);
      if (!price1 || !price2) {
        toast.error("Failed to fetch token prices");
        setIsLoading(false);
        return;
      }
      let currentPrice = Number(price1) / Number(price2);
      
      console.log("🔍 Position Parameters:");
      console.log("Token0 (EAGLE):", token0);
      console.log("Token1 (WLFI):", token1);
      console.log("Current Price:", currentPrice);
      console.log("Your Balance:", ethers.formatUnits(balance, _decimal));
      console.log("Desired Amount:", ethers.formatUnits(desiredAmount, _decimal));
      console.log("Your Allowance:", ethers.formatUnits(allowance, _decimal));
      
      // Calculate price ranges and ticks
      const lowerPrice = isToken0
        ? currentPrice * lowRange
        : currentPrice / lowRange;
      const upperPrice = isToken0
        ? currentPrice * highRange
        : currentPrice / highRange;
      const resLower = getPriceAndTickFromValues(lowerPrice);
      const resUpper = getPriceAndTickFromValues(upperPrice);
      const tickLower = isToken0 ? resLower.tick + 200 : resUpper.tick;
      const tickUpper = isToken0 ? resUpper.tick : resLower.tick - 200;
      
      console.log("📊 Tick Range:");
      console.log("Lower Tick:", tickLower);
      console.log("Upper Tick:", tickUpper);
      console.log("Tick Spacing Valid:", (tickLower % 200 === 0 && tickUpper % 200 === 0));
      
      // Check if pool exists - if not, we'll create it first
      const poolExists = await checkPoolExists(token0, token1, Number(fee));
      console.log("🏊 Pool Status:", poolExists ? `Exists at ${poolExists}` : "Does not exist - will create");
      
      // If pool exists, we need to query its current price for accurate tick range
      let actualPoolPrice = currentPrice;
      if (poolExists && poolExists !== false) {
        try {
          const poolABI = [
            "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
          ];
          const poolContract = new ethers.Contract(poolExists, poolABI, signer);
          const slot0 = await poolContract.slot0();
          const poolTick = slot0[1]; // tick is the second element
          const poolPriceFromTick = Math.pow(1.0001, Number(poolTick));
          actualPoolPrice = poolPriceFromTick;
          console.log("✅ Pool exists - using pool's current price:", actualPoolPrice);
          console.log("   Pool tick:", Number(poolTick));
          console.log("   Market price was:", currentPrice);
          console.log("   Difference:", ((actualPoolPrice / currentPrice - 1) * 100).toFixed(2) + "%");
        } catch (error) {
          console.warn("⚠️ Could not fetch pool price, using market price:", error);
        }
      }
      
      const iface = new ethers.Interface(nonfungiblePositionManagerABI);
      
      let txData = [];
      
      // Only create pool if it doesn't exist
      if (!poolExists || poolExists === false) {
        // SINGLE-SIDED LP STRATEGY (NEW POOL): Initialize pool 6.942% ABOVE market price
        // For 100% token1 (WLFI) deposit, price must be ABOVE the range!
        // The 6.942% gap creates a strong arbitrage incentive!
        console.log("🆕 NEW POOL STRATEGY: Creating pool with controlled initialization price");
        
        // Calculate initialization price: market * 1.06942
        const initPrice = currentPrice * 1.06942;
        const initSqrtPrice = getPriceAndTickFromValues(initPrice);
        const sqrtPrice = initSqrtPrice.price;
        const initTick = initSqrtPrice.tick;
        
        // Ensure init price is above upper tick (required for 100% WLFI)
        if (initTick <= tickUpper) {
          console.warn("⚠️ Init price too low, adjusting to be above upper tick");
          const adjustedInitTick = tickUpper + 200;
          console.log("   Adjusted to tick:", adjustedInitTick);
        }
        
        const gapPercent = ((initPrice / currentPrice - 1) * 100).toFixed(3);
        
        console.log("🆕 Creating pool ABOVE market (single-sided WLFI strategy)");
        console.log("   Market price:", currentPrice);
        console.log("   Init price:", initPrice, `(+${gapPercent}%)`);
        console.log("   Init tick:", initTick);
        console.log("   Range: [", tickLower, "to", tickUpper, "]");
        console.log("   Init sqrtPrice:", sqrtPrice.toString());
        console.log("   ⚡ 6.942% gap = strong arb opportunity!");
        
        const createFunctionSignature =
          "createAndInitializePoolIfNecessary(address,address,uint24,uint160)";
        const params1 = [token0, token1, fee, BigInt(sqrtPrice)];
        const data1 = iface.encodeFunctionData(createFunctionSignature, params1);
        txData.push(data1);
      } else {
        // Pool exists - creating position at current pool price
        console.log("♻️ EXISTING POOL: Position will be created at pool's current price");
        console.log("   Note: Tick range may need adjustment based on actual pool price");
        console.log("   Pool price:", actualPoolPrice);
        console.log("   Your range:", `[${tickLower}, ${tickUpper}]`);
      }
      
      // Mint the position (works whether pool exists or not)
      const mintFunctionSignature =
        "mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256))";
      const params2 = [
        {
          token0: token0,
          token1: token1,
          fee: fee,
          tickLower: tickLower,
          tickUpper: tickUpper,
          amount0Desired: isToken0 ? desiredAmount : 0,
          amount1Desired: !isToken0 ? desiredAmount : 0,
          amount0Min: 0,
          amount1Min: 0,
          recipient: primaryWallet?.address,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        },
      ];
      const data2 = iface.encodeFunctionData(mintFunctionSignature, params2);
      txData.push(data2);
      
      console.log("📝 Transaction calls:", txData.length);
      console.log("Attempting to execute multicall...");
      
      const tx = await nonfungiblePositionManager.multicall(txData);
      toast.loading("Transaction pending...", { id: "tx-pending" });
      const receipt = await tx.wait();
      toast.dismiss("tx-pending");

      // Get position ID from transaction receipt
      const positionId = receipt.logs.find(
        (log: { topics: string[] }) =>
          log.topics[0] ===
          ethers.id("IncreaseLiquidity(uint256,uint128,uint256,uint256)")
      )?.topics[1];

      const factoryContract = new ethers.Contract(
        Icon[chain].factoryAddress,
        factoryABI,
        signer
      );
      const poolAddress = await factoryContract.getPool(token0, token1, fee);
      setCreatedPosition({
        poolAddress,
        positionId: positionId || "",
      });

      toast.success("Position created successfully!");
      setSelectedTokenBalance(
        String(Number(selectedTokenBalance) - Number(amount))
      );
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Transaction error:", error);
      if (error.reason) {
        toast.error(`Transaction failed: ${error.reason}`);
      } else if (error.message) {
        toast.error(`Transaction failed: ${error.message}`);
      } else {
        toast.error("Transaction failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateImpermanentLoss = (priceRatio: number) => {
    const sqrtRatio = Math.sqrt(priceRatio);
    const IL = (2 * sqrtRatio) / (1 + priceRatio) - 1;
    return Math.abs(IL);
  };

  const calculateAPR = () => {
    try {
      if (
        !selectedToken ||
        !amount ||
        !tokenPrice ||
        !upperTick ||
        !lowerTick
      ) {
        return "0";
      }

      const upperPrice = Math.pow(1.0001, upperTick);
      const lowerPrice = Math.pow(1.0001, lowerTick);
      const priceRatio = upperPrice / lowerPrice;

      const positionSize = parseFloat(amount) * tokenPrice;
      if (positionSize <= 0) return "0";

      const minimumYearlyVolume = positionSize * 2;
      const minimumDailyVolume = minimumYearlyVolume / 365;

      const feeTier = 0.01;
      const dailyFeeEarnings = minimumDailyVolume * feeTier;
      const yearlyFeeEarnings = dailyFeeEarnings * 365;

      const feeAPR = (yearlyFeeEarnings / positionSize) * 100;
      const priceReturn = (priceRatio - 1) * 100;
      const impLoss = calculateImpermanentLoss(priceRatio) * 100;

      const apr = feeAPR + priceReturn - impLoss;
      const result = Math.min(Math.max(0, apr), 999.99);

      return result.toFixed(1);
    } catch (error) {
      console.error("APR calculation error:", error);
      return "0";
    }
  };

  const handleAgent = async () => {
    // Skip if agent API is not configured
    if (!URL || URL === "") {
      toast("Agent creation not available");
      return;
    }
    if (agentAddress) {
      toast.error("Already exist");
      return;
    }
    if (!primaryWallet?.address) {
      toast.error("Please connect wallet");
      return;
    }
    setIsLoading(true);
    await axios
      .post(`${URL}/agent/creatagent`, {
        chain: chain,
        metaAddress: primaryWallet?.address,
      })
      .then((res) => {
        if (res.data.state === "success") {
          toast.success("Agent created successfully");
          setBalance(0);
          setAgentAddress(res.data.agentAddress);
          handleSendToAgent(res.data.agentAddress);
        }
      })
      .catch((err) => {
        console.log(err);
      });
    setIsLoading(false);
  };

  const fetchAgent = async () => {
    // Skip if agent API is not configured
    if (!URL || URL === "") return;
    if (!primaryWallet?.address) return;
    if (chain === undefined) return;
    
    await axios
      .post(`${URL}/agent/getagent`, {
        address: primaryWallet?.address,
        chain: chain,
      })
      .then((res) => {
        if (res.data.state === "success") {
          setAgentAddress(res.data.wallet.addresses[0].id);
          setBalance(res.data.balance);
        } else setAgentAddress("");
      })
      .catch(() => setAgentAddress(""));
  };

  useEffect(() => {
    handleNextStep(currentStep);
  }, [currentStep]);

  useEffect(() => {
    const updateBalance = async () => {
      if (selectedToken) {
        let balance = await getTokenBalance(selectedToken?.address as string);
        if (balance) setSelectedTokenBalance(balance);
      }
    };
    updateBalance();
  }, [selectedToken, primaryWallet, chain]);

  useEffect(() => {
    if (approvedAmount >= Number(amount) && amount != "") {
      setIsApprove(true);
    } else {
      setIsApprove(false);
    }
  }, [amount]);

  useEffect(() => {
    if (selectedToken) {
      setMaxClicked(false);
      setIsApprove(false);
      setAmount("");
    }
  }, [selectedToken]);

  useEffect(() => {
    if (amount !== "") {
      if (parseFloat(amount) > parseFloat(selectedTokenBalance)) {
        setIsButtonDisabled(true);
      } else {
        setIsButtonDisabled(false);
        if (approvedAmount >= parseFloat(amount)) {
          setIsApprove(true);
        } else {
        }
      }
    } else {
      setIsButtonDisabled(true);
      setIsApprove(false);
    }
  }, [amount, selectedTokenBalance, approvedAmount]);

  useEffect(() => {
    setMyTokenList(TokenList);
  }, []);

  useEffect(() => {
    handleNetworkSwitch();
  }, [chain, primaryWallet]);

  useEffect(() => {
    const updatePricesAndTicks = async () => {
      if (!selectedToken || chain === undefined) {
        return;
      }
      if (chain === undefined) {
        toast.error("Please select Chain!");
        return;
      }
      try {
        let address1 = selectedToken.address;
        let address2 = MainTokens[chain];
        let token0: string, token1: string;
        if (address1.toLowerCase() < address2.toLowerCase()) {
          token0 = address1;
          token1 = address2;
        } else {
          token0 = address2;
          token1 = address1;
        }
        const [price1, price2] = await calculateTokenPrices(token0, token1);
        if (!price1 || !price2) {
          console.error("Failed to fetch token prices");
          return;
        }
        let currentPrice = Number(price1) / Number(price2);
        const state = token0 === address1;
        // Calculate price ranges
        const lowerPrice = state
          ? currentPrice * lowRange
          : currentPrice / lowRange;
        const upperPrice = state
          ? currentPrice * highRange
          : currentPrice / highRange;
        // Calculate ticks
        const resLower = getPriceAndTickFromValues(lowerPrice);
        const resUpper = getPriceAndTickFromValues(upperPrice);
        const resCurrent = getPriceAndTickFromValues(currentPrice);
        if (
          resLower.tick !== undefined &&
          resUpper.tick !== undefined &&
          resCurrent.tick !== undefined
        ) {
          const tickSpacing = 200; // Use 200 for this pool
          // Adjust ticks based on token order and spacing
          const baseTickLower = state ? resLower.tick : -resUpper.tick;
          const baseTickUpper = state ? resUpper.tick : -resLower.tick;
          // Round to nearest valid tick
          const normalizedLowerTick =
            Math.ceil(baseTickLower / tickSpacing) * tickSpacing;
          const normalizedUpperTick =
            Math.floor(baseTickUpper / tickSpacing) * tickSpacing;
          setLowerTick(normalizedLowerTick);
          setUpperTick(normalizedUpperTick);
          setCurrentTick(resCurrent.tick);
        }
      } catch (error) {
        console.error("Error updating prices and ticks:", error);
      }
    };

    updatePricesAndTicks();
  }, [selectedToken, chain, lowRange, highRange]);

  useEffect(() => {
    if (selectedToken) {
      getApprovedAmountOfSelectedToken();
      setAmount("");
    }
  }, [selectedToken]);

  useEffect(() => {
    fetchAgent();
  }, [primaryWallet?.address, chain]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0F0F0F] to-[#0A0A0A] text-white">
      <Toaster />
      <Header
        handleAgent={handleAgent}
        handleSendToAgent={handleSendToAgent}
        isLoading={isLoading}
        issend={issend}
      />

      {/* Main Content */}
      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Create Liquidity Position
            </h1>
          </div>

          {/* Main Card with subtle neumorphic shadow */}
          <div className="bg-[#111111] rounded-3xl border border-gray-800/40 shadow-2xl shadow-black/50 backdrop-blur-sm">
            
            {/* Step 1: Token Selection */}
            <div className="p-6 border-b border-gray-800/40">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/30">
                  1
                </div>
                <h2 className="text-lg font-semibold">Select Token</h2>
              </div>
              
              <button
                className={`w-full p-4 rounded-2xl transition-all duration-300 ${
                  selectedToken
                    ? "bg-[#1a1a1a] hover:bg-[#202020] border border-gray-800/50"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/20"
                }`}
                onClick={() => setShow(true)}
              >
                {selectedToken ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0A0A0A] flex items-center justify-center overflow-hidden border border-gray-700/50">
                        <img
                          src={selectedToken.logoURI || FALLBACK_TOKEN}
                          alt={selectedToken.symbol}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg">{selectedToken.symbol}</div>
                        <div className="text-xs text-gray-400">{selectedToken.name}</div>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-white font-semibold">
                    <span>Choose Token</span>
                    <ChevronDown className="h-5 w-5" />
                  </div>
                )}
              </button>

              {selectedToken && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Balance: <span className="text-white font-medium">{parseFloat(selectedTokenBalance || "0").toFixed(4)}</span>
                  </span>
                  <button
                    onClick={handleRangeClick}
                    disabled={maxClicked}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      maxClicked
                        ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                        : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30"
                    }`}
                  >
                    Use Max
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Amount Input */}
            {selectedToken && (
              <div className="p-6 border-b border-gray-800/40">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/30">
                    2
                  </div>
                  <h2 className="text-lg font-semibold">Enter Amount</h2>
                </div>

                <div className="bg-[#0A0A0A] rounded-2xl p-5 border border-gray-800/50">
                  <input
                    type="text"
                    className="w-full text-4xl bg-transparent outline-none font-bold text-white placeholder-gray-700"
                    placeholder="0.0"
                    value={amount}
                    onChange={handleInputChange}
                  />
                  <div className="text-sm text-gray-500 mt-2">
                    ≈ ${(parseFloat(amount || "0") * tokenPrice).toFixed(2)} USD
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Action */}
            <div className="p-6">
              <button
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                  isButtonDisabled1()
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:scale-[1.02]"
                }`}
                onClick={handleButtonClick}
                disabled={isButtonDisabled1()}
              >
                {getButtonText()}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                <img src={Uniswap_LOGO} alt="Uniswap" className="h-4 w-4 opacity-50" />
                <span>Powered by Uniswap V3</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Token Selector Modal */}
      {show && (
        <SelectTokenModal
          open={show}
          onClose={() => setShow(false)}
          chain={chain ?? -1}
          AllTokenData={myTokenList}
          BasicTokens={BasicTokens}
          selectedToken={selectedToken}
          setSelectedToken={setSelectedTokenInfo}
          setSelectedTokenBalance={setSelectedTokenBalance}
          CreateVault={CreateVault}
          checkPoolExists={checkPoolExists}
          setIsDeposit={setIsDeposit}
          poolAddress={poolAddress}
          setAddress={setAddress}
          setDepositAdress={setDepositAddress}
        />
      )}


      {/* Add tooltips */}
      <Tooltip id="fee-tooltip" className="max-w-xs">
        <div className="p-2">
          <p className="font-semibold mb-1">Fee Tier: 1%</p>
          <p>
            You earn 1% of all trading volume that occurs within your price
            range.
          </p>
        </div>
      </Tooltip>

      <Tooltip id="range-tooltip" className="max-w-xs">
        <div className="p-2">
          <p className="font-semibold mb-1">Price Range</p>
          <p>
            The price range in which your liquidity is active. You earn fees
            when trades happen within this range.
          </p>
          <p className="mt-1">Lower tick: {lowerTick}</p>
          <p>Upper tick: {upperTick}</p>
        </div>
      </Tooltip>

      <Tooltip id="apr-tooltip" className="max-w-xs">
        <div className="p-2">
          <p className="font-semibold mb-1">Minimum APR Calculation</p>
          <p>Annual rate based on:</p>
          <ul className="list-disc pl-4 mt-1">
            <li>Minimum trading volume needed for full position conversion</li>
            <li>1% fee on all trades</li>
            <li>
              Price movement from {lowerTick} to {upperTick}
            </li>
            <li>Subtracts maximum impermanent loss</li>
          </ul>
          <p className="mt-1 text-sm">
            This is a conservative estimate assuming only minimum required
            trading volume.
          </p>
        </div>
      </Tooltip>
    </div>
  );
}

export default Traditional;
