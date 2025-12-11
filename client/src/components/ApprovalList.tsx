import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ExternalLink, History, ArrowUpDown, Info, Loader2, RefreshCw, Copy, ShieldOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { BrowserProvider, Contract } from "ethers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { switchNetwork } from "@/lib/arc-network";

interface Approval {
  id: string;
  contractName: string;
  contractAddress: string;
  asset: string;
  amount: string;
  risk: 'High' | 'Medium' | 'Low';
  trustValue: string;
  revokeTrends: number;
  lastUpdated: string;
  approvedAssets: number;
}

interface TokenItem {
  contractAddress: string;
  name: string;
  symbol: string;
  balance: string;
  decimals: string;
}

export function ApprovalList({ account }: { account: string | null }) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [spenderAddress, setSpenderAddress] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (account) {
      fetchApprovals();
    }
  }, [account]);

  const fetchApprovals = async () => {
    if (!account) return;
    setIsLoading(true);
    
    try {
      const response = await fetch(`https://testnet.arcscan.app/api?module=account&action=tokenlist&address=${account}`);
      const data = await response.json();
      
      if (data.result && Array.isArray(data.result)) {
        const mappedApprovals: Approval[] = data.result.map((token: TokenItem, index: number) => ({
          id: token.contractAddress,
          contractName: token.name,
          contractAddress: token.contractAddress,
          asset: token.symbol,
          amount: "Unknown", 
          risk: "Medium",
          trustValue: "$0.00",
          revokeTrends: 0,
          lastUpdated: "Just now",
          approvedAssets: 1
        }));
        setApprovals(mappedApprovals);
      } else {
        setApprovals([]);
      }
    } catch (error) {
      console.error("Failed to fetch approvals", error);
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSingle = async (tokenAddress: string) => {
    if (!spenderAddress) {
      toast({ 
        title: "Spender Required", 
        description: "Please enter a spender address above",
        variant: "destructive" 
      });
      return;
    }

    if (!window.ethereum || !account) {
      toast({ 
        title: "Wallet Not Connected", 
        description: "Please connect your wallet first",
        variant: "destructive" 
      });
      return;
    }

    setIsRevoking(true);
    
    try {
      await switchNetwork();
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
      const contract = new Contract(tokenAddress, ABI, signer);

      const tx = await contract.approve(spenderAddress, 0);
      toast({ 
        title: "Transaction Sent", 
        description: "MetaMask opened - confirm the transaction",
        variant: "default"
      });
      
      await tx.wait();
      
      toast({ 
        title: "Revoke Successful", 
        description: `Successfully revoked permission for ${spenderAddress}`,
        variant: "default"
      });
      
    } catch (err: any) {
      console.error(err);
      if (err.code === 4001) {
        toast({ title: "Transaction Rejected", description: "You rejected the transaction", variant: "destructive" });
      } else {
        toast({ title: "Revoke Failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeBatch = async () => {
    if (selectedTokens.size === 0) {
      toast({ 
        title: "No Tokens Selected", 
        description: "Please select at least one token to revoke",
        variant: "destructive" 
      });
      return;
    }

    if (!spenderAddress) {
      toast({ 
        title: "Spender Required", 
        description: "Please enter a spender address above",
        variant: "destructive" 
      });
      return;
    }

    if (!window.ethereum || !account) {
      toast({ 
        title: "Wallet Not Connected", 
        description: "Please connect your wallet first",
        variant: "destructive" 
      });
      return;
    }

    setIsRevoking(true);
    
    try {
      await switchNetwork();
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
      
      let successCount = 0;
      let failCount = 0;

      for (const tokenAddress of Array.from(selectedTokens)) {
        try {
          const contract = new Contract(tokenAddress, ABI, signer);
          const tx = await contract.approve(spenderAddress, 0);
          await tx.wait();
          successCount++;
        } catch (err) {
          console.error(`Failed to revoke ${tokenAddress}:`, err);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast({ 
          title: "Batch Revoke Complete", 
          description: `Successfully revoked ${successCount} token(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
          variant: "default"
        });
      }

      if (failCount === selectedTokens.size) {
        toast({ 
          title: "All Failed", 
          description: "All revoke transactions failed",
          variant: "destructive" 
        });
      }

      setSelectedTokens(new Set());
      
    } catch (err: any) {
      console.error(err);
      if (err.code === 4001) {
        toast({ title: "Transaction Rejected", description: "You rejected the transaction", variant: "destructive" });
      } else {
        toast({ title: "Batch Revoke Failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setIsRevoking(false);
    }
  };

  const toggleTokenSelection = (tokenAddress: string) => {
    const newSelected = new Set(selectedTokens);
    if (newSelected.has(tokenAddress)) {
      newSelected.delete(tokenAddress);
    } else {
      newSelected.add(tokenAddress);
    }
    setSelectedTokens(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTokens.size === approvals.length) {
      setSelectedTokens(new Set());
    } else {
      setSelectedTokens(new Set(approvals.map(a => a.contractAddress)));
    }
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Scanning Arc Testnet for tokens...</p>
        </div>
    )
  }

  if (approvals.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
               <ShieldAlert size={32} className="text-primary" />
            </div>
            <h3 className="text-2xl font-display font-bold text-white">No Tokens Found</h3>
            <p className="text-muted-foreground max-w-md mb-4">
              We couldn't find any tokens with potential approvals in your wallet.
            </p>
            <Button variant="outline" onClick={fetchApprovals} className="gap-2" data-testid="button-refresh">
                <RefreshCw size={14} /> Refresh
            </Button>
        </div>
     );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
              <Button variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                  My Tokens ({approvals.length})
              </Button>
              <Button variant="ghost" onClick={fetchApprovals} className="text-muted-foreground hover:text-primary gap-2" data-testid="button-refresh-list">
                  <RefreshCw size={14} /> Refresh
              </Button>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-lg space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase text-primary">Spender Address (Required)</Label>
            <Input 
              placeholder="0x... (contract or wallet address)" 
              value={spenderAddress}
              onChange={(e) => setSpenderAddress(e.target.value)}
              className="bg-black/50 border-primary/30 focus:border-primary font-mono"
              data-testid="input-spender-address"
            />
            <p className="text-[10px] text-muted-foreground">
              Enter the address you want to revoke permissions for
            </p>
          </div>

          {selectedTokens.size > 0 && (
            <Button 
              onClick={handleRevokeBatch} 
              disabled={isRevoking || !spenderAddress}
              className="w-full bg-primary text-black hover:bg-primary/90 font-bold"
              data-testid="button-revoke-batch"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Revoke Selected ({selectedTokens.size})
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-card/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-black/40">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={selectedTokens.size === approvals.length && approvals.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead className="text-muted-foreground font-mono uppercase text-xs tracking-wider">Token</TableHead>
              <TableHead className="text-muted-foreground font-mono uppercase text-xs tracking-wider">Symbol</TableHead>
              <TableHead className="text-muted-foreground font-mono uppercase text-xs tracking-wider">Address</TableHead>
              <TableHead className="w-[150px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvals.map((approval) => (
              <TableRow key={approval.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                <TableCell>
                  <Checkbox 
                    checked={selectedTokens.has(approval.contractAddress)}
                    onCheckedChange={() => toggleTokenSelection(approval.contractAddress)}
                    data-testid={`checkbox-token-${approval.contractAddress}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-primary border border-white/10 shrink-0">
                      <ShieldAlert size={14} />
                    </div>
                    <span className="text-sm font-medium text-white">{approval.contractName || "Unknown Token"}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-white">{approval.asset}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{approval.contractAddress}</TableCell>
                <TableCell>
                    <Button 
                        size="sm" 
                        onClick={() => handleRevokeSingle(approval.contractAddress)}
                        disabled={isRevoking || !spenderAddress}
                        className="bg-primary text-black hover:bg-primary/90 h-8 font-bold"
                        data-testid={`button-revoke-${approval.contractAddress}`}
                    >
                        {isRevoking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Revoke'
                        )}
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
