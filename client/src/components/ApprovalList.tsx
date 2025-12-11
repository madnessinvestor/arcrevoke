import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ExternalLink, History, ArrowUpDown, Info } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

export function ApprovalList({ account }: { account: string | null }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRevoking, setIsRevoking] = useState(false);
  const { toast } = useToast();

  const mockApprovals: Approval[] = [
    {
      id: "1",
      contractName: "Unknown Contract",
      contractAddress: "0xaf88d0...8e5831",
      asset: "USDC",
      amount: "Unlimited",
      risk: "High",
      trustValue: "$0.00",
      revokeTrends: 6,
      lastUpdated: "25 days ago",
      approvedAssets: 1
    },
    {
      id: "2",
      contractName: "OpenSea Registry",
      contractAddress: "0x1e0049...003c71",
      asset: "WETH",
      amount: "Unlimited",
      risk: "Low",
      trustValue: "$0.00",
      revokeTrends: 9,
      lastUpdated: "1 year ago",
      approvedAssets: 1
    },
    {
      id: "3",
      contractName: "Z Protocol",
      contractAddress: "0xf9ca71...4a77f5",
      asset: "USDT",
      amount: "5000.00",
      risk: "Medium",
      trustValue: "$0.00",
      revokeTrends: 1,
      lastUpdated: "1 year ago",
      approvedAssets: 1
    },
    {
      id: "4",
      contractName: "Felix Exchange",
      contractAddress: "0x56a346...0779ab",
      asset: "ARC",
      amount: "100.00",
      risk: "Low",
      trustValue: "$0.00",
      revokeTrends: 0,
      lastUpdated: "1 month ago",
      approvedAssets: 1
    }
  ];

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
           <ShieldAlert size={32} className="text-primary" />
        </div>
        <h3 className="text-2xl font-display font-bold text-white">Connect Wallet to View Approvals</h3>
        <p className="text-muted-foreground max-w-md">
          Connect your wallet to scan for active token approvals and revoke permissions for the connected account on Arc Testnet.
        </p>
      </div>
    );
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(mockApprovals.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleRevoke = async (id?: string) => {
    setIsRevoking(true);
    const count = id ? 1 : selectedIds.length;
    
    setTimeout(() => {
      setIsRevoking(false);
      toast({
        title: "Revoke Successful",
        description: `Successfully revoked ${count} approval${count > 1 ? 's' : ''}`,
      });
      if (id) {
         // In a real app we'd remove it from the list
      } else {
         setSelectedIds([]);
      }
    }, 2000);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4">
            <Button variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                By Contracts
            </Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-primary">
                By Assets
            </Button>
        </div>
        
        {selectedIds.length > 0 && (
           <Button 
             onClick={() => handleRevoke()}
             disabled={isRevoking}
             className="bg-primary text-black hover:bg-primary/90 font-bold"
           >
             {isRevoking ? "Revoking..." : `Revoke Selected (${selectedIds.length})`}
           </Button>
        )}
      </div>

      <div className="rounded-md border border-white/10 bg-card/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-black/40">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={selectedIds.length === mockApprovals.length && mockApprovals.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-black"
                />
              </TableHead>
              <TableHead className="text-muted-foreground font-mono uppercase text-xs tracking-wider">Contract</TableHead>
              <TableHead className="text-muted-foreground font-mono uppercase text-xs tracking-wider">
                  <div className="flex items-center gap-1">
                      Trust Value <Info size={12} />
                  </div>
              </TableHead>
              <TableHead className="text-muted-foreground font-mono uppercase text-xs tracking-wider">
                  <div className="flex items-center gap-1">
                    24h Revoke Trends <ArrowUpDown size={12} />
                  </div>
              </TableHead>
              <TableHead className="text-muted-foreground font-mono uppercase text-xs tracking-wider">
                  <div className="flex items-center gap-1">
                    My Approval Time <ArrowUpDown size={12} />
                  </div>
              </TableHead>
              <TableHead className="text-muted-foreground font-mono uppercase text-xs tracking-wider text-right">My Approved Assets</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockApprovals.map((approval) => (
              <TableRow key={approval.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.includes(approval.id)}
                    onCheckedChange={(checked) => handleSelectOne(approval.id, checked as boolean)}
                    className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-black"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-primary border border-white/10">
                        {approval.risk === 'High' ? <ShieldAlert size={14} className="text-red-500" /> : <ShieldAlert size={14} />}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{approval.contractName}</span>
                            <a href="#" className="text-muted-foreground hover:text-primary"><ExternalLink size={12} /></a>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{approval.contractAddress}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-red-400">{approval.trustValue}</TableCell>
                <TableCell className="font-mono text-sm text-white">{approval.revokeTrends}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{approval.lastUpdated}</TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 text-white font-mono">
                        {approval.approvedAssets} 
                        <span className="text-muted-foreground text-xs">&gt;</span>
                    </div>
                </TableCell>
                <TableCell>
                    <Button 
                        size="sm" 
                        onClick={() => handleRevoke(approval.id)}
                        disabled={isRevoking}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 text-primary hover:bg-primary hover:text-black h-8 font-bold border border-primary/20"
                    >
                        Revoke
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
