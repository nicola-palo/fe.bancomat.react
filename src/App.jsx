import { useState, useCallback } from 'react'
import ChatWidget from './ChatWidget'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// Phases
const PHASE = {
  INSERT_CARD: 0,
  ENTER_PIN: 1,
  OPERATIONS: 2,
  GOODBYE: 3,
}

// JWT decoder
function decodeJwt(token) {
  if (!token) return { header: null, payload: null }
  try {
    const parts = token.split('.')
    const decode = (str) => {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
      return JSON.parse(atob(base64))
    }
    return { header: decode(parts[0]), payload: decode(parts[1]) }
  } catch {
    return { header: null, payload: null }
  }
}

// Format card number
function formatCardNumber(num) {
  const clean = num.replace(/\D/g, '')
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function maskCardNumber(num) {
  const clean = num.replace(/\D/g, '')
  if (clean.length < 8) return clean
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`
}

// Validazioni locali
function validateCardNumber(cardNumber) {
  const clean = cardNumber.replace(/\D/g, '')
  if (!clean) return 'Inserisci il numero della carta'
  if (clean.length !== 16) return 'Il numero carta deve essere di 16 cifre'
  return null
}

function validatePin(pin) {
  if (!pin) return 'Inserisci il PIN'
  if (pin.length < 4) return 'Il PIN deve essere di almeno 4 cifre'
  if (pin.length > 6) return 'Il PIN deve essere di massimo 6 cifre'
  if (!/^\d+$/.test(pin)) return 'Il PIN deve contenere solo numeri'
  return null
}

function validateAmount(amount) {
  if (!amount) return 'Inserisci l\'importo'
  const num = parseFloat(amount.replace(',', '.'))
  if (isNaN(num)) return 'Importo non valido'
  if (num <= 0) return 'L\'importo deve essere maggiore di zero'
  if (num > 10000) return 'Importo massimo: €10.000'
  return null
}

// API helper
async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.message || `Errore ${res.status}`)
  }
  return data
}

// Icons
const CreditCardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const ChevronUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
)

export default function App() {
  const [phase, setPhase] = useState(PHASE.INSERT_CARD)
  const [cardNumber, setCardNumber] = useState('1111222233334444')
  const [pin, setPin] = useState('')
  const [token, setToken] = useState(null)
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [operation, setOperation] = useState(null) // 'deposit' | 'withdraw'
  const [amount, setAmount] = useState('')
  const [showJwt, setShowJwt] = useState(false)
  const [cardValidation, setCardValidation] = useState(null) // { valid, active, maskedNumber }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const resetAll = useCallback(() => {
    setPhase(PHASE.INSERT_CARD)
    setPin('')
    setToken(null)
    setAccount(null)
    setOperation(null)
    setAmount('')
    setCardValidation(null)
    clearMessages()
  }, [])

  // Phase 1: Insert card - Valida con il BE
  const handleInsertCard = async () => {
    const cleanCard = cardNumber.replace(/\D/g, '')

    // Validazione locale prima
    const localError = validateCardNumber(cleanCard)
    if (localError) {
      setError(localError)
      return
    }

    setLoading(true)
    clearMessages()

    try {
      // Valida la carta col backend
      const validation = await apiFetch('/auth/validate-card', {
        method: 'POST',
        body: { cardNumber: cleanCard },
      })

      setCardValidation(validation)

      if (!validation.valid) {
        setError('Carta non riconosciuta. Verifica il numero e riprova.')
        return
      }

      if (!validation.active) {
        setError('Questa carta è bloccata. Contatta la tua banca.')
        return
      }

      // Carta valida e attiva, procedi al PIN
      setPhase(PHASE.ENTER_PIN)
    } catch (e) {
      setError(e.message || 'Errore nella verifica della carta')
    } finally {
      setLoading(false)
    }
  }

  // Phase 2: Enter PIN
  const handleLogin = async () => {
    // Validazione locale
    const pinError = validatePin(pin)
    if (pinError) {
      setError(pinError)
      return
    }

    setLoading(true)
    clearMessages()

    try {
      const data = await apiFetch('/auth/card-login', {
        method: 'POST',
        body: { cardNumber: cardNumber.replace(/\D/g, ''), pin },
      })
      setToken(data.token)
      setAccount(data.account)
      setPhase(PHASE.OPERATIONS)
    } catch (e) {
      // Mostra messaggio dal backend con tentativi rimanenti
      if (e.message.includes('Attempts remaining')) {
        // Estrai il numero di tentativi
        const match = e.message.match(/Attempts remaining: (\d+)/)
        if (match) {
          setError(`PIN errato. Tentativi rimanenti: ${match[1]}`)
        } else {
          setError('PIN errato. Riprova.')
        }
      } else if (e.message.includes('blocked') || e.message.includes('inactive') || e.message.includes('too many failed')) {
        setError('Carta bloccata per troppi tentativi errati. Usa la chat per sbloccarla.')
        setPhase(PHASE.INSERT_CARD)
        setCardValidation(null)
      } else if (e.message.includes('Invalid PIN')) {
        setError('PIN errato. Riprova.')
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEject = () => {
    if (token) {
      setPhase(PHASE.GOODBYE)
    } else {
      resetAll()
    }
  }

  // Phase 3: Operations
  const handleOperation = async () => {
    if (!operation) {
      setError('Seleziona un\'operazione')
      return
    }

    // Validazione importo
    const amountError = validateAmount(amount)
    if (amountError) {
      setError(amountError)
      return
    }

    const numAmount = parseFloat(amount.replace(',', '.'))

    // Validazione prelievo: verifica saldo sufficiente
    if (operation === 'withdraw' && numAmount > account.balance) {
      setError(`Saldo insufficiente. Disponibile: €${Number(account.balance).toFixed(2)}`)
      return
    }

    setLoading(true)
    clearMessages()

    try {
      const data = await apiFetch(`/accounts/${account.id}/${operation}`, {
        method: 'POST',
        body: { amount: numAmount },
        token,
      })
      setAccount(data)
      setSuccess(`${operation === 'deposit' ? 'Deposito' : 'Prelievo'} di €${numAmount.toFixed(2)} completato`)
      setAmount('')
      setOperation(null)
    } catch (e) {
      // Messaggi più user-friendly
      if (e.message.includes('Insufficient')) {
        setError('Saldo insufficiente per questo prelievo')
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    resetAll()
  }

  // Handler per input carta con validazione in tempo reale
  const handleCardChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16)
    setCardNumber(value)
    setCardValidation(null) // Reset validazione quando cambia il numero
    clearMessages()
  }

  // Handler per input PIN
  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPin(value)
    clearMessages()
  }

  // Handler per input importo
  const handleAmountChange = (e) => {
    // Permetti numeri, virgola e punto
    const value = e.target.value.replace(/[^\d,.]/, '')
    setAmount(value)
    clearMessages()
  }

  const jwt = decodeJwt(token)

  return (
    <div className="app">
      <div className="atm-container">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <CreditCardIcon />
          </div>
          <h1 className="title">ATM Simulator</h1>
          <p className="subtitle">Simulatore bancomat</p>
        </header>

        {/* Server Warning - solo nella prima fase */}
        {phase === PHASE.INSERT_CARD && (
          <div className="warning-card">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <div className="warning-title">Attenzione: Server in modalità risparmio</div>
              <p className="warning-text">
                Il backend è ospitato su un server gratuito che entra in modalità riposo dopo alcuni minuti di inattività. 
                La prima richiesta potrebbe richiedere <strong>circa 5 minuti o più</strong>. Le successive saranno immediate.
              </p>
            </div>
          </div>
        )}

        {/* Phase indicator */}
        <div className="phase-indicator">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`phase-dot ${phase === i ? 'active' : ''} ${phase > i ? 'completed' : ''}`}
            />
          ))}
        </div>

        {/* Phase 0: Insert card */}
        {phase === PHASE.INSERT_CARD && (
          <div className="card">
            <h2 className="card-title">Inserisci la carta</h2>
            <p className="card-description">
              Inserisci il numero della tua carta per iniziare le operazioni.
            </p>

            <div className="card-visual">
              <div className="card-chip" />
              <div className="card-number">
                {formatCardNumber(cardNumber) || '•••• •••• •••• ••••'}
              </div>
              <div className="card-info-row">
                <span>ATM CARD</span>
                <span>VALID</span>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Numero carta (16 cifre)</label>
              <input
                type="text"
                className="input input-card"
                placeholder="1234 5678 9012 3456"
                value={formatCardNumber(cardNumber)}
                onChange={handleCardChange}
                maxLength={19}
                disabled={loading}
              />
              {cardNumber.replace(/\D/g, '').length > 0 && cardNumber.replace(/\D/g, '').length < 16 && (
                <div className="input-hint">
                  {16 - cardNumber.replace(/\D/g, '').length} cifre rimanenti
                </div>
              )}
            </div>

            {error && <div className="status status-error">{error}</div>}

            <button
              className="btn btn-primary"
              onClick={handleInsertCard}
              disabled={loading || cardNumber.replace(/\D/g, '').length !== 16}
            >
              {loading ? <span className="spinner" /> : 'Inserisci carta'}
            </button>
          </div>
        )}

        {/* Phase 1: Enter PIN */}
        {phase === PHASE.ENTER_PIN && (
          <div className="card">
            <h2 className="card-title">Inserisci il PIN</h2>
            <p className="card-description">
              Carta: {cardValidation?.maskedNumber || maskCardNumber(cardNumber)}
            </p>

            <div className="input-group">
              <label className="input-label">PIN (4-6 cifre)</label>
              <input
                type="password"
                className="input input-pin"
                placeholder="••••"
                value={pin}
                onChange={handlePinChange}
                maxLength={6}
                autoFocus
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && pin.length >= 4 && handleLogin()}
              />
              {pin.length > 0 && pin.length < 4 && (
                <div className="input-hint">
                  Minimo 4 cifre ({4 - pin.length} rimanenti)
                </div>
              )}
            </div>

            {error && <div className="status status-error">{error}</div>}

            <button
              className="btn btn-primary"
              onClick={handleLogin}
              disabled={loading || pin.length < 4}
            >
              {loading ? <span className="spinner" /> : 'Conferma'}
            </button>

            <div className="btn-row">
              <button className="btn btn-secondary" onClick={handleEject} disabled={loading}>
                Espelli carta
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: Operations */}
        {phase === PHASE.OPERATIONS && account && (
          <div className="card">
            <div className="account-info">
              <div className="account-label">Saldo disponibile</div>
              <div className="account-balance">
                €{Number(account.balance).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </div>
              <div className="account-details">
                <div>
                  <div className="account-label">Intestatario</div>
                  <div className="account-detail-value">
                    {account.owner?.firstName} {account.owner?.lastName}
                  </div>
                </div>
                <div>
                  <div className="account-label">Conto</div>
                  <div className="account-detail-value">
                    {account.accountNumber?.slice(-8)}
                  </div>
                </div>
              </div>
            </div>

            <div className="operations">
              <button
                className={`op-btn ${operation === 'deposit' ? 'active' : ''}`}
                onClick={() => { setOperation('deposit'); clearMessages(); setAmount(''); }}
              >
                <div className="op-btn-icon">💵</div>
                <div className="op-btn-label">Deposita</div>
              </button>
              <button
                className={`op-btn ${operation === 'withdraw' ? 'active' : ''}`}
                onClick={() => { setOperation('withdraw'); clearMessages(); setAmount(''); }}
              >
                <div className="op-btn-icon">💸</div>
                <div className="op-btn-label">Preleva</div>
              </button>
            </div>

            {operation && (
              <div className="amount-section">
                <div className="input-group">
                  <label className="input-label">
                    Importo da {operation === 'deposit' ? 'depositare' : 'prelevare'}
                    {operation === 'withdraw' && (
                      <span className="input-hint-inline">
                        {' '}(max €{Number(account.balance).toFixed(2)})
                      </span>
                    )}
                  </label>
                  <div className="amount-input-wrapper">
                    <span className="amount-currency">€</span>
                    <input
                      type="text"
                      className="input input-amount"
                      placeholder="0,00"
                      value={amount}
                      onChange={handleAmountChange}
                      autoFocus
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  className={`btn ${operation === 'deposit' ? 'btn-success' : 'btn-danger'}`}
                  onClick={handleOperation}
                  disabled={loading || !amount}
                >
                  {loading ? (
                    <span className="spinner" />
                  ) : (
                    `Conferma ${operation === 'deposit' ? 'deposito' : 'prelievo'}`
                  )}
                </button>
              </div>
            )}

            {error && <div className="status status-error">{error}</div>}
            {success && <div className="status status-success">{success}</div>}

            {/* JWT Section */}
            <div className="jwt-section">
              <div className="jwt-toggle" onClick={() => setShowJwt(!showJwt)}>
                {showJwt ? <ChevronUp /> : <ChevronDown />}
                <span>Token di sessione (JWT)</span>
              </div>

              {showJwt && (
                <div className="jwt-content">
                  <div className="jwt-label">Token (firmato HS256)</div>
                  <div className="jwt-value">{token}</div>

                  <div className="jwt-decoded">
                    <div>
                      <div className="jwt-label">Header</div>
                      <pre>{JSON.stringify(jwt.header, null, 2)}</pre>
                    </div>
                    <div>
                      <div className="jwt-label">Payload</div>
                      <pre>{JSON.stringify(jwt.payload, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="exit-section">
              <button className="exit-btn" onClick={handleEject}>
                🔒 Termina sessione ed espelli carta
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: Goodbye */}
        {phase === PHASE.GOODBYE && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>👋</div>
            <h2 className="card-title">Arrivederci!</h2>
            <p className="card-description">
              La sessione è terminata. Ritira la tua carta.
            </p>
            <button className="btn btn-primary" onClick={handleFinish}>
              Nuova operazione
            </button>
          </div>
        )}
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  )
}
