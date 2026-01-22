import { Appearance } from "@/components/Common/Appearance"
import { Footer } from "./Footer"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2" data-theme="light">
      <div
        className="relative hidden lg:flex lg:items-center lg:justify-center"
        style={{
          backgroundColor: 'white',
          borderRight: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }}
      >
    <div className="flex flex-col items-center justify-center p-8">
  <div className="group flex flex-col items-center transition-all duration-300">
    
    {/* 1. Enhanced Logo Container */}
    <div className="relative mb-2">
      <img
        src="/zensustech-logo-2.png"
        alt="ZensusTech Logo"
        className="h-36 w-auto object-contain drop-shadow-sm group-hover:drop-shadow-md transition-all"
      />
    </div>

    {/* 2. Micro-Divider (Adds visual balance) */}
    <div className="w-12 h-[2px] bg-blue-500 rounded-full mb-4 opacity-80"></div>

    {/* 3. Refined Tagline */}
    <div className="flex flex-col items-center gap-1">
      <p className="text-slate-900 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.2em] whitespace-nowrap leading-none">
        AI-Powered Azure Managed Services
      </p>
      <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.1em] whitespace-nowrap">
        Security <span className="text-blue-400 mx-1">•</span> Identity <span className="text-blue-400 mx-1">•</span> Cost Optimization
      </p>
    </div>
    
  </div>
</div>
      </div>
      <div
        className="flex flex-col gap-4 p-6 md:p-10"
        style={{
          backgroundColor: 'white',
          color: '#000000',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
        }}
      >
        <div className="flex justify-end">
          <Appearance />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-100">
            {children}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
}
