import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ExternalLink, History, ArrowUpDown, Info, Loader2, RefreshCw, Copy, ShieldOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { BrowserProvider, Contract } from "ethers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [selectedToken, setSelectedToken] = useState<Approval | null>(null);
  const [spenderAddress, setSpenderAddress] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const openRevokeDialog = (token: Approval) => {
      setSelectedToken(token);
      setSpenderAddress('');
      setDialogOpen(true);
  };

  const handleRevoke = async () => {
    if (!selectedToken || !spenderAddress || !window.ethereum) return;

    setIsRevoking(true);
    
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
      const contract = new Contract(selectedToken.contractAddress, ABI, signer);

      const tx = await contract.approve(spenderAddress, 0);
      toast({ title: "Transaction Sent", description: "Waiting for confirmation..." });
      
      await tx.wait();
      
      toast({ 
          title: "Revoke Successful", 
          description: `Successfully revoked permission for ${spenderAddress}`,
          variant: "default"
      });
      setDialogOpen(false);
      
    } catch (err: any) {
      console.error(err);
      toast({ title: "Revoke Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRevoking(false);
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
            <Button variant="outline" onClick={fetchApprovals} className="gap-2">
                <RefreshCw size={14} /> Refresh
            </Button>
        </div>
     );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4">
            <Button variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                My Tokens ({approvals.length})
            </Button>
            <Button variant="ghost" onClick={fetchApprovals} className="text-muted-foreground hover:text-primary gap-2">
                <RefreshCw size={14} /> Refresh
            </Button>
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-card/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-black/40">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-[50px]"></TableHead>
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
                  <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-primary border border-white/10">
                      <ShieldAlert size={14} />
                  </div>
                </TableCell>
                <TableCell>
                    <span className="text-sm font-medium text-white">{approval.contractName || "Unknown Token"}</span>
                </TableCell>
                <TableCell className="font-mono text-sm text-white">{approval.asset}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{approval.contractAddress}</TableCell>
                <TableCell>
                    <Button 
                        size="sm" 
                        onClick={() => openRevokeDialog(approval)}
                        className="bg-primary text-black hover:bg-primary/90 h-8 font-bold"
                    >
                        Revoke
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-panel bg-black/90 border-primary/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
                <ShieldOff className="text-primary" /> Revoke Permission
            </DialogTitle>
            <DialogDescription>
              Revoke allowance for <strong>{selectedToken?.asset}</strong> ({selectedToken?.contractName}).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase text-muted-foreground">Token Address</Label>
                <Input value={selectedToken?.contractAddress} disabled className="bg-white/5 border-white/10 font-mono text-xs" />
            </div>
            
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase text-primary">Spender Address (Required)</Label>
                <Input 
                    placeholder="0x... (e.g. Uniswap Router)" 
                    value={spenderAddress}
                    onChange={(e) => setSpenderAddress(e.target.value)}
                    className="bg-black/50 border-primary/30 focus:border-primary font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                    Enter the address of the contract/wallet you want to revoke permissions for.
                </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
                onClick={handleRevoke} 
                disabled={isRevoking || !spenderAddress}
                className="bg-primary text-black font-bold"
            >
                {isRevoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
