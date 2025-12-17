'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSdkError } from '@walletconnect/utils'
import { Core } from '@walletconnect/core'
import { Web3Wallet } from '@walletconnect/web3wallet'
import SessionProposal from './_components/SessionProposal'
import SessionRequest from './_components/SessionRequest'
import AuthRequest from './_components/AuthRequest'

export let core, web3wallet

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loaded, setLoaded] = useState(false)
  const [wallets, setWallets] = useState([])
  const [modal, setModal] = useState(null)
  const [activeSessions, setActiveSessions] = useState([])

  useEffect(() => {
    getWallets()
    initWalletConnect()
  }, [])

  useEffect(() => {
    if (web3wallet)
      setActiveSessions(web3wallet.getActiveSessions() || [])
  }, [modal])

  async function getWallets() {
    // Get your Venly wallets (GET /api/wallets)
    const myWallets = await EXAMPLE.getWallets()
    setWallets(myWallets)
  }

  async function initWalletConnect() {
    core = new Core({ 
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID
    })

    web3wallet = await Web3Wallet.init({
      core,
      metadata: {
        name: 'Venly Demo',
        description: 'Venly WalletConnect Demo App',
        url: 'https://walletconnect.venly.io',
        icons: ['https://storage.venly.io/brand/icon-gradient-background.png']
      }
    })

    web3wallet.on('session_proposal', (event) => {
      setModal({
        type: 'session_proposal',
        data: event
      })
    })
    web3wallet.on('session_request', (event) => {
      setModal({
        type: 'session_request',
        data: event
      })
    })
    web3wallet.on('auth_request', (event) => {
      setModal({
        type: 'auth_request',
        data: event
      })
    })
    web3wallet.on('session_delete', () => {
      setActiveSessions(web3wallet.getActiveSessions() || [])
    })

    const uri = searchParams.get('uri')
    if (uri) {
      try {
        await web3wallet.core.pairing.pair({ uri })
      }
      catch (err) {
        console.error(err)
      }
      // Clear search params
      router.replace('/', undefined, { shallow: true })
    }

    setActiveSessions(web3wallet.getActiveSessions() || [])
    setLoaded(true)
  }

  async function onPasteUri() {
    const uri = await navigator.clipboard.readText()
    try {
      await web3wallet.core.pairing.pair({ uri })
    }
    catch (err) {
      console.error(err)
    }
  }

  async function disconnectSession(topic) {
    await web3wallet.disconnectSession({
      topic,
      reason: getSdkError('USER_DISCONNECTED')
    })
    setActiveSessions(web3wallet.getActiveSessions() || [])
  }

  return (
    <div className="container">
      <h3 className="heading">WalletConnect Demo</h3>

      <div className="block">
        <h5>Active Sessions:</h5>
        {Object.keys(activeSessions).map(key => {
          const metadata = activeSessions[key].peer.metadata
          return (
            <div key={key}>
              <p>{metadata.name} ({metadata.url})</p>
              <button onClick={() => disconnectSession(key)}>Disconnect</button>
            </div>
          )
        })}
      </div>
      
      <div className="footer">
        {loaded ?
          <button onClick={() => onPasteUri()}>Paste WalletConnect URI</button>
          :
          <div>Initializing WalletConnect...</div>
        }
      </div>

      {modal?.type == 'session_proposal' &&
        <SessionProposal event={modal.data} wallets={wallets} closeModal={() => setModal(null)} />
      }
      {modal?.type == 'session_request' &&
        <SessionRequest event={modal.data} closeModal={() => setModal(null)} />
      }
      {modal?.type == 'auth_request' &&
        <AuthRequest event={modal.data} wallets={wallets} closeModal={() => setModal(null)} />
      }
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="container"><div>Loading...</div></div>}>
      <HomeContent />
    </Suspense>
  )
}
