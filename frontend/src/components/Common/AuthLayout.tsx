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
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <img
              src="/zensustech-logo.png"
              alt="ZensusTech Logo"
              className="h-20 w-20"
            />
            <span className="text-3xl font-bold text-black">
              ZensusTech
            </span>
          </div>
          <p className="text-gray-600 text-sm max-w-xs leading-relaxed">
            Secure cloud governance and identity management platform
          </p>
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
