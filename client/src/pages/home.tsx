import { ConnectWallet } from "@/components/ConnectWallet";
import { ApprovalList } from "@/components/ApprovalList";
import { ManualRevoke } from "@/components/ManualRevoke";
import { ShieldCheck, Search, Activity, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import generatedImage from '@assets/generated_images/futuristic_abstract_dark_crypto_background_with_neon_networks.png';
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url(${generatedImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(0,243,255,0.3)]">
              <ShieldCheck className="text-primary h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-display font-bold text-white tracking-widest">
                ARC<span className="text-primary">REVOKE</span>
              </h1>
              <span className="text-[10px] text-muted-foreground tracking-[0.2em] font-mono">TESTNET SECURE PROTOCOL</span>
            </div>
          </div>
          
          <ConnectWallet onAccountChange={setAccount} />
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-panel p-6 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity size={64} />
            </div>
            <h3 className="text-muted-foreground text-sm font-mono mb-2">NETWORK STATUS</h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-display font-bold text-white">Online</span>
              <div className="h-3 w-3 rounded-full bg-green-500 mb-2 animate-pulse shadow-[0_0_10px_#22c55e]" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Arc Testnet • block 402911</p>
          </div>

          <div className="glass-panel p-6 rounded-xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Lock size={64} />
            </div>
            <h3 className="text-muted-foreground text-sm font-mono mb-2">ASSETS SECURED</h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-display font-bold text-white">$1.2M+</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Across 5,000+ wallets</p>
          </div>

          <div className="glass-panel p-6 rounded-xl relative overflow-hidden group flex flex-col justify-center">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Search size={64} />
            </div>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search contract by name or address..." 
                className="bg-black/40 border-white/10 pl-10 focus:border-primary/50 focus:ring-primary/20 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Revoke Area */}
          <div className="lg:col-span-2">
             <div className="glass-panel rounded-xl p-6 md:p-8 min-h-[500px]">
                <ApprovalList account={account} />
             </div>
          </div>

          {/* Manual Revoke Sidebar */}
          <div className="lg:col-span-1">
             <div className="sticky top-8">
               <ManualRevoke account={account} />
               
               <div className="mt-6 p-4 rounded border border-yellow-500/20 bg-yellow-500/5">
                 <h4 className="text-yellow-500 font-bold flex items-center gap-2 mb-2">
                   <Activity size={16} /> Beta Notice
                 </h4>
                 <p className="text-xs text-muted-foreground">
                   Automatic scanning is currently in beta. If your contract doesn't appear in the list, use the Manual Revoke tool above with the specific contract addresses.
                 </p>
               </div>
             </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/80 mt-12 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm font-mono">
            SECURED BY ARC NETWORK • TESTNET ENVIRONMENT
          </p>
        </div>
      </footer>
    </div>
  );
}
