import { x402Client, wrapFetchWithPayment } from '@x402-avm/fetch'
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm'
import type { ClientAvmSigner } from '@x402-avm/avm'
import { ExactAvmScheme } from '@x402-avm/avm/exact/client'
import { clearDeflySession, clearAllWalletSessions } from './walletSession'

/**
 * Creates a fetch wrapper that automatically handles x402 payment flows
 * @param walletSigner - The connected wallet signer from use-wallet
 * @returns A fetch function that handles 402 payment challenges
 */
export async function createX402Fetch(walletSigner: any) {
  console.log('createX402Fetch: initializing for address', walletSigner.address)
  const client = new x402Client()

  // Keep a reference to original transactions
  let originalTxns: Uint8Array[] = []

  const x402Signer: ClientAvmSigner = {
    address: walletSigner.address,
    signTransactions: async (txns: Uint8Array[]) => {
      try {
        console.log('x402Signer.signTransactions: received', txns.length, 'transaction(s)')
        originalTxns = txns

        txns.forEach((txn, i) => {
          console.log(`Txn ${i}: ${txn.byteLength} bytes, first 10 bytes:`, Array.from(txn.slice(0, 10)))
        })

        console.log('Calling wallet.signTransactions...')
        await ensureWalletReady(walletSigner)
        const walletResult = await walletSigner.signTransactions(txns)

        console.log('Wallet returned:', typeof walletResult, Array.isArray(walletResult) ? `[${walletResult.length}]` : '')

        if (Array.isArray(walletResult)) {
          const result = walletResult.map((item: any, i: number) => {
            if (item === null || item === undefined) {
              console.log(`Item ${i}: unsigned — using original (${originalTxns[i]?.byteLength} bytes)`)
              return originalTxns[i]
            }
            if (item instanceof Uint8Array) return item
            if (typeof item === 'string') {
              // base64 → Uint8Array
              const binary = atob(item)
              const bytes = new Uint8Array(binary.length)
              for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
              return bytes
            }
            return originalTxns[i]
          })
          console.log('Returning', result.length, 'transactions')
          return result
        }

        return walletResult
      } catch (error) {
        console.error('signTransactions error:', error)
        throw normalizeWalletError(error)
      }
    },
  }

  client.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(x402Signer))
  console.log('x402 client registered for TestNet')

  return wrapFetchWithPayment(fetch, client)
}

async function ensureWalletReady(walletSigner: any) {
  const activeWallet = walletSigner?.activeWallet

  if (!activeWallet) {
    throw new Error('No active wallet. Connect your wallet and try again.')
  }

  // WalletConnect wallets (Defly, Pera) require USER interaction to establish
  // a session — we cannot auto-reconnect programmatically.
  // Detect a broken/stale session and fail fast with a clear message.
  const provider = activeWallet?.client ?? activeWallet?.provider
  const connectorIsNull =
    provider !== null &&
    provider !== undefined &&
    (provider as any)?.connector === null

  if (connectorIsNull) {
    clearAllWalletSessions()
    throw new Error(
      'Wallet session expired (connector lost). Stale session cleared — click "Disconnect", refresh the page, and reconnect your wallet.',
    )
  }

  if (!activeWallet.isConnected) {
    throw new Error(
      'Wallet is not connected. Please connect your wallet via the button above, then try again.',
    )
  }
}

function normalizeWalletError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  // DeflyWalletConnect not initialized — stale WalletConnect session
  if (
    message.includes('DeflyWalletConnect was not initialized correctly') ||
    message.includes('DeflyWalletConnect was not initialized')
  ) {
    clearDeflySession()
    return new Error(
      'Defly session was stale. Session cleared — please disconnect, refresh the page, and reconnect Defly.',
    )
  }

  // Null connector (sendCustomRequest on null) — common after page refresh
  if (
    message.includes("reading 'sendCustomRequest'") ||
    message.includes('sendCustomRequest') ||
    message.includes('Cannot read properties of null')
  ) {
    clearAllWalletSessions()
    return new Error(
      'Wallet connector was null (stale session). All sessions cleared — please refresh the page and reconnect your wallet.',
    )
  }

  // Pera mobile stale session
  if (message.includes('PeraWalletConnect was not initialized correctly')) {
    clearAllWalletSessions()
    return new Error(
      'Pera session was stale. Session cleared — please refresh the page and reconnect your wallet.',
    )
  }

  return error
}

/**
 * Fetches weather data with x402 payment handling
 */
export async function fetchWeatherWithPayment(url: string, walletSigner: any): Promise<any> {
  try {
    console.log('\n=== fetchWeatherWithPayment START ===')
    const fetchFn = await createX402Fetch(walletSigner)
    const response = await fetchFn(url)
    console.log('Response status:', response.status)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    console.log('SUCCESS - Weather data:', data)
    return data
  } catch (error) {
    console.error('FAILED:', error)
    if (error instanceof Error) throw new Error(`Weather API: ${error.message}`)
    throw error
  }
}

export function formatWeatherData(data: any): string {
  if (!data) return 'No data'
  return JSON.stringify(data, null, 2)
}
