import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BrowserProvider, Contract } from 'ethers';
import { Loader2, ShieldOff, AlertTriangle, CheckCircle } from 'lucide-react';

export function ManualRevoke({ account }: { account: string | null }) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [spenderAddress, setSpenderAddress] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const { toast } = useToast();

  const handleRevoke = async () => {
    if (!tokenAddress || !spenderAddress) {
      toast({ title: "Input Required", description: "Please enter both Token and Spender addresses.", variant: "destructive" });
      return;
    }
    
    if (!account || !window.ethereum) {
      toast({ title: "Wallet Not Connected", description: "Please connect your wallet first.", variant: "destructive" });
      return;
    }

    setIsRevoking(true);
    setStatus({ type: 'loading', message: 'Preparing transaction...' });

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const ABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
      ];

      const contract = new Contract(tokenAddress, ABI, signer);
      
      // Optional: Check allowance first (as per user snippet logic)
      setStatus({ type: 'loading', message: 'Checking current allowance...' });
      const owner = await signer.getAddress();
      try {
        const current = await contract.allowance(owner, spenderAddress);
        console.log(`Current allowance: ${current.toString()}`);
      } catch (e) {
        console.warn("Could not check allowance, proceeding to revoke anyway.");
      }

      setStatus({ type: 'loading', message: 'Please confirm transaction in your wallet...' });
      const tx = await contract.approve(spenderAddress, 0);
      
      setStatus({ type: 'loading', message: 'Transaction sent! Waiting for confirmation...' });
      await tx.wait();
      
      setStatus({ type: 'success', message: `Revoke Successful! Hash: ${tx.hash.slice(0, 10)}...` });
      toast({ title: "Revoked", description: "Successfully revoked permissions." });
      
      // Clear inputs
      // setTokenAddress(''); // Keep token for convenience
      setSpenderAddress('');
      
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || "Transaction failed" });
      toast({ title: "Revoke Failed", description: err.message || "Transaction failed", variant: "destructive" });
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <Card className="glass-panel border-primary/20 bg-black/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white font-display tracking-wide">
          <ShieldOff className="text-primary" />
          Manual Revoke
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Manually revoke permissions for a specific token and spender.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token" className="text-xs font-mono uppercase text-muted-foreground">Token Address (ERC-20)</Label>
          <Input 
            id="token" 
            placeholder="0x..." 
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="bg-black/40 border-white/10 font-mono text-sm focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="spender" className="text-xs font-mono uppercase text-muted-foreground">Spender Address (Contract/Wallet)</Label>
          <Input 
            id="spender" 
            placeholder="0x..." 
            value={spenderAddress}
            onChange={(e) => setSpenderAddress(e.target.value)}
            className="bg-black/40 border-white/10 font-mono text-sm focus:border-primary/50"
          />
        </div>

        {status.type !== 'idle' && (
          <div className={`text-sm p-3 rounded border ${
            status.type === 'loading' ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' :
            status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-200' :
            'bg-red-500/10 border-red-500/20 text-red-200'
          } flex items-center gap-2 break-all`}>
            {status.type === 'loading' && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
            {status.type === 'success' && <CheckCircle className="h-4 w-4 shrink-0" />}
            {status.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span className="font-mono text-xs">{status.message}</span>
          </div>
        )}

        <Button 
          onClick={handleRevoke}
          disabled={isRevoking || !account}
          className="w-full bg-primary text-black hover:bg-primary/90 font-bold tracking-wide mt-2"
        >
          {isRevoking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "REVOKE PERMISSION"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
