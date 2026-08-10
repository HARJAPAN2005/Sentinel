import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { useState } from 'react'
import Home from './Home'
import MemeHome from './MemeHome'
import ConnectWallet from './components/ConnectWallet'
import SentinelDashboard from './components/SentinelDashboard'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.LUTE },
    { id: WalletId.DEFLY },
  ]
}

type TabType = 'sentinel' | 'weather' | 'meme'

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const [activeTab, setActiveTab] = useState<TabType>('sentinel')
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <div className="min-h-screen bg-ink-navy text-paper font-body">
          {/* Neo-Brutalist Top Navigation Bar */}
          <header className="border-b border-graphite/40 bg-ink-navy sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex space-x-2 py-2 font-ledger text-xs">
                <button
                  onClick={() => setActiveTab('sentinel')}
                  className={`px-4 py-2 border font-bold uppercase transition-all ${
                    activeTab === 'sentinel'
                      ? 'border-block-red text-paper bg-block-red/10'
                      : 'border-graphite/30 text-graphite hover:text-paper hover:border-graphite'
                  }`}
                >
                  🛡️ Sentinel Policy Engine
                </button>
                <button
                  onClick={() => setActiveTab('weather')}
                  className={`px-4 py-2 border font-bold uppercase transition-all ${
                    activeTab === 'weather'
                      ? 'border-settle-blue text-paper bg-settle-blue/10'
                      : 'border-graphite/30 text-graphite hover:text-paper hover:border-graphite'
                  }`}
                >
                  🌤️ Weather Demo
                </button>
                <button
                  onClick={() => setActiveTab('meme')}
                  className={`px-4 py-2 border font-bold uppercase transition-all ${
                    activeTab === 'meme'
                      ? 'border-brass text-paper bg-brass/10'
                      : 'border-graphite/30 text-graphite hover:text-paper hover:border-graphite'
                  }`}
                >
                  🎨 Meme Generator
                </button>
              </div>
            </div>
          </header>

          {/* Active Tab View */}
          <div>
            {activeTab === 'sentinel' && <SentinelDashboard onConnectWallet={() => setOpenWalletModal(true)} />}
            {activeTab === 'weather' && <Home />}
            {activeTab === 'meme' && <MemeHome />}
          </div>

          <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
        </div>
      </WalletProvider>
    </SnackbarProvider>
  )
}
