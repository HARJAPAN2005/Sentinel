const TXNLAB_WALLET_KEY = '@txnlab/use-wallet:v4'
const PERA_WALLET_KEY = 'PeraWallet.Wallet'
const PERA_WALLETCONNECT_KEY = 'walletconnect'
const DEFLY_WALLET_KEY = 'DeflyWallet.Wallet'
const DEFLY_WALLETCONNECT_KEY = 'deflyConnector'

export function clearStalePeraMobileSession() {
  if (typeof window === 'undefined') return false

  const peraWallet = window.localStorage.getItem(PERA_WALLET_KEY)
  const walletConnect = window.localStorage.getItem(PERA_WALLETCONNECT_KEY)

  if (!peraWallet || walletConnect) return false

  try {
    const parsedPeraWallet = JSON.parse(peraWallet)
    if (parsedPeraWallet?.type !== 'pera-wallet') return false
  } catch {
    return false
  }

  window.localStorage.removeItem(PERA_WALLET_KEY)
  window.localStorage.removeItem(PERA_WALLETCONNECT_KEY)

  const txnLabState = window.localStorage.getItem(TXNLAB_WALLET_KEY)
  if (txnLabState) {
    try {
      const parsedState = JSON.parse(txnLabState)
      if (parsedState?.activeWallet === 'pera') {
        window.localStorage.removeItem(TXNLAB_WALLET_KEY)
      }
    } catch {
      window.localStorage.removeItem(TXNLAB_WALLET_KEY)
    }
  }

  return true
}

export function clearPeraSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PERA_WALLET_KEY)
  window.localStorage.removeItem(PERA_WALLETCONNECT_KEY)

  const txnLabState = window.localStorage.getItem(TXNLAB_WALLET_KEY)
  if (!txnLabState) return

  try {
    const parsedState = JSON.parse(txnLabState)
    if (parsedState?.activeWallet === 'pera' || parsedState?.wallets?.pera) {
      window.localStorage.removeItem(TXNLAB_WALLET_KEY)
    }
  } catch {
    window.localStorage.removeItem(TXNLAB_WALLET_KEY)
  }
}

/** Clear stale Defly WalletConnect session from localStorage */
export function clearDeflySession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(DEFLY_WALLET_KEY)
  window.localStorage.removeItem(DEFLY_WALLETCONNECT_KEY)
  // Also nuke any walletconnect key that Defly might have reused
  window.localStorage.removeItem(PERA_WALLETCONNECT_KEY)

  const txnLabState = window.localStorage.getItem(TXNLAB_WALLET_KEY)
  if (!txnLabState) return

  try {
    const parsedState = JSON.parse(txnLabState)
    if (parsedState?.activeWallet === 'defly' || parsedState?.wallets?.defly) {
      window.localStorage.removeItem(TXNLAB_WALLET_KEY)
    }
  } catch {
    window.localStorage.removeItem(TXNLAB_WALLET_KEY)
  }
}

/** Nuclear option: clear ALL wallet sessions (use when unsure which wallet was active) */
export function clearAllWalletSessions() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PERA_WALLET_KEY)
  window.localStorage.removeItem(PERA_WALLETCONNECT_KEY)
  window.localStorage.removeItem(DEFLY_WALLET_KEY)
  window.localStorage.removeItem(DEFLY_WALLETCONNECT_KEY)
  window.localStorage.removeItem(TXNLAB_WALLET_KEY)
}
