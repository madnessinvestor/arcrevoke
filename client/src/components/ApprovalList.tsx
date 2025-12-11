import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, Loader2, RefreshCw, ShieldOff, AlertTriangle, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import { Input } from "@/components/ui/input";
import { switchNetwork, ARC_TESTNET } from "@/lib/arc-network";

interface Token {
  contractAddress: string;
  name: string;
  symbol: string;
}

interface DetectedApproval {
  id: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  spenderAddress: string;
}

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

export function ApprovalList({ account }: { account: string | null }) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [detectedApprovals, setDetectedApprovals] = useState<DetectedApproval[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [isBatchRevoking, setIsBatchRevoking] = useState(false);
  const [globalSpender, setGlobalSpender] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (account) {
      fetchTokens();
    } else {
      setTokens([]);
      setDetectedApprovals([]);
    }
  }, [account]);

  const fetchTokens = async () => {
    if (!account) return;
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `https://testnet.arcscan.app/api?module=account&action=tokenlist&address=${account}`
      );
      const data = await response.json();
      
      if (data.result && Array.isArray(data.result)) {
        setTokens(data.result);
        scanForApprovals(data.result);
      } else {
        setTokens([]);
      }
    } catch (error) {
      console.error("Failed to fetch tokens", error);
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  };

  const scanForApprovals = async (tokenList: Token[]) => {
    if (!account || tokenList.length === 0) return;
    setIsScanning(true);
    
    try {
      const provider = new JsonRpcProvider(ARC_TESTNET.rpcUrls[0]);
      const paddedOwner = account.toLowerCase().replace('0x', '').padStart(64, '0');
      const topic1 = '0x' + paddedOwner;
      const found: DetectedApproval[] = [];

      for (const token of tokenList) {
        try {
          const logsResponse = await fetch(
            `https://testnet.arcscan.app/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address=${token.contractAddress}&topic0=${APPROVAL_TOPIC}&topic1=${topic1}&topic0_1_opr=and`
          );
          const logsData = await logsResponse.json();
          
          if (logsData.result && Array.isArray(logsData.result) && logsData.result.length > 0) {
            const spendersSet = new Set<string>();
            
            for (const log of logsData.result) {
              if (log.topics && log.topics[2]) {
                const spender = '0x' + log.topics[2].slice(-40);
                spendersSet.add(spender.toLowerCase());
              }
            }

            const contract = new Contract(token.contractAddress, ERC20_ABI, provider);
            
            for (const spender of Array.from(spendersSet)) {
              try {
                const allowance = await contract.allowance(account, spender);
                if (allowance > BigInt(0)) {
                  found.push({
                    id: `${token.contractAddress}-${spender}`,
                    tokenAddress: token.contractAddress,
                    tokenName: token.name || 'Unknown',
                    tokenSymbol: token.symbol || '???',
                    spenderAddress: spender
                  });
                }
              } catch (e) {
                console.error('Allowance check failed:', e);
              }
            }
          }
        } catch (e) {
          console.error(`Error scanning ${token.contractAddress}:`, e);
        }
      }

      setDetectedApprovals(found);
      
      if (found.length > 0) {
        toast({ 
          title: "Scan Complete", 
          description: `Found ${found.length} active approval(s)`
        });
      }
    } catch (error) {
      console.error("Scan failed", error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRevokeDetected = async (approval: DetectedApproval) => {
    if (!window.ethereum || !account) {
      toast({ title: "Wallet Not Connected", variant: "destructive" });
      return;
    }

    setRevokingIds(prev => new Set(prev).add(approval.id));
    
    try {
      await switchNetwork();
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(approval.tokenAddress, ERC20_ABI, signer);
      const tx = await contract.approve(approval.spenderAddress, 0);
      
      toast({ title: "Transaction Sent", description: "Confirm in wallet" });
      await tx.wait();
      
      toast({ title: "Revoked", description: `${approval.tokenSymbol} approval revoked` });
      setDetectedApprovals(prev => prev.filter(a => a.id !== approval.id));
      
    } catch (err: any) {
      if (err.code === 4001) {
        toast({ title: "Rejected", variant: "destructive" });
      } else {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setRevokingIds(prev => {
        const next = new Set(prev);
        next.delete(approval.id);
        return next;
      });
    }
  };

  const handleRevokeToken = async (tokenAddress: string) => {
    if (!globalSpender) {
      toast({ title: "Enter Spender Address", description: "Enter the spender address above", variant: "destructive" });
      return;
    }
    if (!window.ethereum || !account) {
      toast({ title: "Wallet Not Connected", variant: "destructive" });
      return;
    }

    setRevokingIds(prev => new Set(prev).add(tokenAddress));
    
    try {
      await switchNetwork();
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(tokenAddress, ERC20_ABI, signer);
      const tx = await contract.approve(globalSpender, 0);
      
      toast({ title: "Transaction Sent", description: "Confirm in wallet" });
      await tx.wait();
      
      toast({ title: "Revoked", description: "Permission revoked successfully" });
      
    } catch (err: any) {
      if (err.code === 4001) {
        toast({ title: "Rejected", variant: "destructive" });
      } else {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setRevokingIds(prev => {
        const next = new Set(prev);
        next.delete(tokenAddress);
        return next;
      });
    }
  };

  const handleBatchRevokeDetected = async () => {
    const toRevoke = detectedApprovals.filter(a => selectedIds.has(a.id));
    if (toRevoke.length === 0) return;
    if (!window.ethereum || !account) {
      toast({ title: "Wallet Not Connected", variant: "destructive" });
      return;
    }

    setIsBatchRevoking(true);
    
    try {
      await switchNetwork();
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      let success = 0;
      const revokedIds: string[] = [];

      for (const approval of toRevoke) {
        try {
          const contract = new Contract(approval.tokenAddress, ERC20_ABI, signer);
          const tx = await contract.approve(approval.spenderAddress, 0);
          await tx.wait();
          success++;
          revokedIds.push(approval.id);
        } catch (err) {
          console.error('Batch revoke error:', err);
        }
      }
      
      toast({ title: "Batch Complete", description: `Revoked ${success}/${toRevoke.length}` });
      setDetectedApprovals(prev => prev.filter(a => !revokedIds.includes(a.id)));
      setSelectedIds(new Set());
      
    } catch (err: any) {
      toast({ title: "Batch Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsBatchRevoking(false);
    }
  };

  const handleBatchRevokeTokens = async () => {
    if (!globalSpender) {
      toast({ title: "Enter Spender Address", variant: "destructive" });
      return;
    }
    const toRevoke = tokens.filter(t => selectedTokens.has(t.contractAddress));
    if (toRevoke.length === 0) return;
    if (!window.ethereum || !account) {
      toast({ title: "Wallet Not Connected", variant: "destructive" });
      return;
    }

    setIsBatchRevoking(true);
    
    try {
      await switchNetwork();
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      let success = 0;

      for (const token of toRevoke) {
        try {
          const contract = new Contract(token.contractAddress, ERC20_ABI, signer);
          const tx = await contract.approve(globalSpender, 0);
          await tx.wait();
          success++;
        } catch (err) {
          console.error('Batch revoke error:', err);
        }
      }
      
      toast({ title: "Batch Complete", description: `Revoked ${success}/${toRevoke.length}` });
      setSelectedTokens(new Set());
      
    } catch (err: any) {
      toast({ title: "Batch Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsBatchRevoking(false);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading tokens...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
          <ShieldAlert size={32} className="text-primary" />
        </div>
        <h3 className="text-2xl font-display font-bold text-white">Connect Wallet</h3>
        <p className="text-muted-foreground max-w-md">Connect your wallet to view tokens</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="detected" className="w-full">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <TabsList className="bg-black/40">
          <TabsTrigger value="detected" className="data-[state=active]:bg-primary data-[state=active]:text-black">
            Detected ({detectedApprovals.length}) {isScanning && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="tokens" className="data-[state=active]:bg-primary data-[state=active]:text-black">
            My Tokens ({tokens.length})
          </TabsTrigger>
        </TabsList>
        <Button variant="ghost" onClick={fetchTokens} className="text-muted-foreground hover:text-primary gap-2" data-testid="button-refresh">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <TabsContent value="detected" className="space-y-4">
        {selectedIds.size > 0 && (
          <Button 
            onClick={handleBatchRevokeDetected} 
            disabled={isBatchRevoking}
            className="bg-primary text-black hover:bg-primary/90 font-bold w-full"
            data-testid="button-batch-revoke-detected"
          >
            {isBatchRevoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldOff className="mr-2 h-4 w-4" />}
            Revoke Selected ({selectedIds.size})
          </Button>
        )}

        {detectedApprovals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <ShieldOff size={28} className="text-green-500" />
            </div>
            <h3 className="text-xl font-display font-bold text-white">No Active Approvals Detected</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              {isScanning ? "Scanning blockchain..." : "Use 'My Tokens' tab to revoke manually if needed"}
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-card/40 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-black/40">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedIds.size === detectedApprovals.length}
                      onCheckedChange={() => {
                        if (selectedIds.size === detectedApprovals.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(detectedApprovals.map(a => a.id)));
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Token</TableHead>
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Spender</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detectedApprovals.map((approval) => (
                  <TableRow key={approval.id} className="border-white/5 hover:bg-white/5">
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.has(approval.id)}
                        onCheckedChange={() => {
                          const next = new Set(selectedIds);
                          if (next.has(approval.id)) next.delete(approval.id);
                          else next.add(approval.id);
                          setSelectedIds(next);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                          <AlertTriangle size={14} />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-white">{approval.tokenSymbol}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono">{formatAddress(approval.tokenAddress)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-white">{formatAddress(approval.spenderAddress)}</span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm"
                        onClick={() => handleRevokeDetected(approval)}
                        disabled={revokingIds.has(approval.id)}
                        className="bg-primary text-black hover:bg-primary/90 h-8 font-bold"
                      >
                        {revokingIds.has(approval.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revoke'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="tokens" className="space-y-4">
        <div className="glass-panel p-4 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-muted-foreground" />
            <span className="text-xs font-mono uppercase text-primary">Spender Address (for manual revoke)</span>
          </div>
          <Input 
            placeholder="0x..." 
            value={globalSpender}
            onChange={(e) => setGlobalSpender(e.target.value)}
            className="bg-black/50 border-primary/30 focus:border-primary font-mono"
            data-testid="input-global-spender"
          />
          {selectedTokens.size > 0 && globalSpender && (
            <Button 
              onClick={handleBatchRevokeTokens} 
              disabled={isBatchRevoking}
              className="bg-primary text-black hover:bg-primary/90 font-bold w-full"
            >
              {isBatchRevoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldOff className="mr-2 h-4 w-4" />}
              Revoke Selected ({selectedTokens.size})
            </Button>
          )}
        </div>

        {tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <ShieldAlert size={32} className="text-primary" />
            <p className="text-muted-foreground">No tokens found</p>
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-card/40 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-black/40">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedTokens.size === tokens.length}
                      onCheckedChange={() => {
                        if (selectedTokens.size === tokens.length) {
                          setSelectedTokens(new Set());
                        } else {
                          setSelectedTokens(new Set(tokens.map(t => t.contractAddress)));
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Token</TableHead>
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Symbol</TableHead>
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Address</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.contractAddress} className="border-white/5 hover:bg-white/5">
                    <TableCell>
                      <Checkbox 
                        checked={selectedTokens.has(token.contractAddress)}
                        onCheckedChange={() => {
                          const next = new Set(selectedTokens);
                          if (next.has(token.contractAddress)) next.delete(token.contractAddress);
                          else next.add(token.contractAddress);
                          setSelectedTokens(next);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-primary border border-white/10">
                          <ShieldAlert size={14} />
                        </div>
                        <span className="text-sm font-medium text-white">{token.name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-white">{token.symbol}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatAddress(token.contractAddress)}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm"
                        onClick={() => handleRevokeToken(token.contractAddress)}
                        disabled={revokingIds.has(token.contractAddress) || !globalSpender}
                        className="bg-primary text-black hover:bg-primary/90 h-8 font-bold disabled:opacity-50"
                      >
                        {revokingIds.has(token.contractAddress) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revoke'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
