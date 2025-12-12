import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BrowserProvider } from 'ethers';
import { switchNetwork, ARC_TESTNET } from '@/lib/arc-network';
import { Wallet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ConnectWallet({ onAccountChange, onNetworkChange }: { onAccountChange?: (account: string | null) => void; onNetworkChange?: (isWrongNetwork: boolean) => void }) {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
    
    if (window.ethereum) {
      window.ethereum.on('chainChanged', (chainId: string) => {
        // When chain changes, if it's not Arc Testnet, update state
        if (chainId.toLowerCase() !== ARC_TESTNET.chainId.toLowerCase()) {
          setWrongNetwork(true);
          onNetworkChange?.(true);
        } else {
          setWrongNetwork(false);
          onNetworkChange?.(false);
        }
      });
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
            setAccount(accounts[0]);
            onAccountChange?.(accounts[0]);
            forceNetworkSwitch();
        } else {
            setAccount(null);
            onAccountChange?.(null);
        }
      });
    }
  }, []);
  
  const getActualChainId = async (): Promise<string> => {
    if (!window.ethereum) return '';
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId.toLowerCase();
  };

  const forceNetworkSwitch = async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_TESTNET.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [ARC_TESTNET],
          });
        } catch (addError) {
          console.error('Failed to add Arc Testnet', addError);
        }
      }
    }
    
    // Use direct eth_chainId request for fresh chain info
    try {
      const currentChainId = await getActualChainId();
      const isWrong = currentChainId !== ARC_TESTNET.chainId.toLowerCase();
      setWrongNetwork(isWrong);
      onNetworkChange?.(isWrong);
    } catch (e) {
      console.error('Failed to verify network:', e);
    }
  };

  const autoSwitchNetwork = async () => {
    if (!window.ethereum) return;
    
    try {
      const currentChainId = await getActualChainId();
      
      if (currentChainId !== ARC_TESTNET.chainId.toLowerCase()) {
        try {
          await switchNetwork();
        } catch (e) {
          console.error("Switch network failed:", e);
        }
        
        // Use direct eth_chainId request for fresh chain info
        const newChainId = await getActualChainId();
        const isWrong = newChainId !== ARC_TESTNET.chainId.toLowerCase();
        setWrongNetwork(isWrong);
        onNetworkChange?.(isWrong);
        
        if (!isWrong) {
          toast({
            title: "Network Changed",
            description: "Automatically switched to Arc Testnet",
          });
        }
      }
    } catch (e) {
      console.error("Error auto-switching network", e);
    }
  };

  const checkConnection = async () => {
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      try {
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            setAccount(accounts[0].address);
            onAccountChange?.(accounts[0].address);
            
            // Use direct eth_chainId request for accurate network state
            const currentChainId = await getActualChainId();
            const isWrong = currentChainId !== ARC_TESTNET.chainId.toLowerCase();
            setWrongNetwork(isWrong);
            onNetworkChange?.(isWrong);
        }
      } catch (e) {
        console.error("Error checking connection", e);
      }
    }
  };

  const connect = async () => {
    if (!window.ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or Rabby wallet.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      onAccountChange?.(accounts[0]);
      
      // First check current network
      const currentChainId = await getActualChainId();
      const targetChainId = ARC_TESTNET.chainId.toLowerCase();
      
      if (currentChainId !== targetChainId) {
        // Try to add and switch to Arc Testnet
        try {
          // First try to add the chain (in case it doesn't exist)
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [ARC_TESTNET],
          });
        } catch (addError: any) {
          // Chain might already exist, try switching directly
          console.log('Chain might already exist, trying to switch...');
        }
        
        // Now try to switch to Arc Testnet
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_TESTNET.chainId }],
          });
          
          // Wait a bit for the chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (switchError: any) {
          console.error('Switch error:', switchError);
          // If user rejected, we'll show wrong network state
          if (switchError.code === 4001) {
            toast({
              title: "Network Switch Required",
              description: "Please approve the network switch to use Arc Testnet.",
              variant: "destructive",
            });
          }
        }
      }
      
      // Use direct eth_chainId request for fresh chain info after switch attempt
      const finalChainId = await getActualChainId();
      const isCorrectNetwork = finalChainId === targetChainId;
      setWrongNetwork(!isCorrectNetwork);
      onNetworkChange?.(!isCorrectNetwork);
      
      if (isCorrectNetwork) {
        toast({
          title: "Connected",
          description: "Wallet connected to Arc Testnet.",
        });
      } else {
        toast({
          title: "Wrong Network",
          description: "Please click 'SWITCH TO ARC' to change network.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  const handleSwitch = async () => {
    const targetChainId = ARC_TESTNET.chainId.toLowerCase();
    
    try {
      // First try to add the chain (some wallets require this)
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [ARC_TESTNET],
        });
      } catch (addError: any) {
        // Chain might already exist, continue to switch
        console.log('Chain add attempt:', addError.message);
      }
      
      // Now switch to the chain
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_TESTNET.chainId }],
      });
      
      // Wait for chain switch to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the switch
      const currentChainId = await getActualChainId();
      const isCorrectNetwork = currentChainId === targetChainId;
      setWrongNetwork(!isCorrectNetwork);
      onNetworkChange?.(!isCorrectNetwork);
      
      if (isCorrectNetwork) {
        toast({
          title: "Network Changed",
          description: "Successfully switched to Arc Testnet.",
        });
      }
    } catch (e: any) {
      console.error('Failed to switch network:', e);
      
      if (e.code === 4001) {
        toast({
          title: "Network Switch Rejected",
          description: "Please approve the network switch in your wallet.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Network Switch Failed",
          description: "Failed to switch to Arc Testnet. Please try manually.",
          variant: "destructive",
        });
      }
    }
  };

  if (account && wrongNetwork) {
      return (
        <div className="flex flex-col items-end gap-1">
          <Button 
            onClick={handleSwitch} 
            variant="destructive"
            className="font-bold font-display tracking-wide animate-pulse h-9"
            data-testid="button-switch-network"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            SWITCH TO ARC
          </Button>
          <span className="text-[10px] text-red-500 font-mono">Wrong Network</span>
        </div>
      );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button 
        onClick={connect} 
        disabled={isConnecting}
        className="bg-primary hover:bg-primary/90 text-black font-bold font-display tracking-wide glow-effect h-9"
        data-testid="button-connect-wallet"
      >
        {isConnecting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="mr-2 h-4 w-4" />
        )}
        {account ? formatAddress(account) : "CONNECT WALLET"}
      </Button>
      <div className="flex items-center gap-1 text-[10px] text-primary font-mono">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_#00f3ff]" />
        {account ? "Arc Testnet" : "Arc Testnet Network"}
      </div>
    </div>
  );
}
