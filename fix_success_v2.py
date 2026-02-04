filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remplacer le useEffect entier - mettre la detection success APRES loadData
old = """useEffect(() => { 
    loadData()
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      const ref = params.get('ref')
      const bid = params.get('bookingId')
const dep = params.get('deposit')
const email = params.get('email')
const name = params.get('name')
if (ref) {
  setBookingRef(ref)
  if (bid) {
    setCurrentBookingId(bid)
    if (dep) setReturnedDepositAmount(parseFloat(dep))
    if (email) setReturnedEmail(decodeURIComponent(email))
    if (name) setReturnedName(decodeURIComponent(name))
          // Aller à l'étape caution si Stripe est activé
          setStep('deposit')
        } else {
          setStep('confirmation')
        }
        (() => {
          const keep = new URLSearchParams()
          const cur = new URLSearchParams(window.location.search)
          if (cur.get('lang')) keep.set('lang', cur.get('lang')!)
          if (cur.get('category')) keep.set('category', cur.get('category')!)
          if (cur.get('returnUrl')) keep.set('returnUrl', cur.get('returnUrl')!)
          window.history.replaceState({}, '', window.location.pathname + '?' + keep.toString())
        })()
      }
    }
    if (params.get('canceled') === 'true') {
      alert(lang === 'fr' ? 'Paiement annulé' : lang === 'es' ? 'Pago cancelado' : 'Payment canceled');
      (() => {
          const keep = new URLSearchParams()
          const cur = new URLSearchParams(window.location.search)
          if (cur.get('lang')) keep.set('lang', cur.get('lang')!)
          if (cur.get('category')) keep.set('category', cur.get('category')!)
          if (cur.get('returnUrl')) keep.set('returnUrl', cur.get('returnUrl')!)
          window.history.replaceState({}, '', window.location.pathname + '?' + keep.toString())
        })()
    }
  }, [])"""

new = """useEffect(() => { 
    const params = new URLSearchParams(window.location.search)
    const isSuccess = params.get('success') === 'true'
    const isCanceled = params.get('canceled') === 'true'
    
    loadData()
    
    if (isSuccess) {
      const ref = params.get('ref')
      const bid = params.get('bookingId')
      const dep = params.get('deposit')
      const email = params.get('email')
      const name = params.get('name')
      console.log('[WIDGET] Success detected:', { ref, bid, dep, email, name })
      if (ref) setBookingRef(ref)
      if (bid) setCurrentBookingId(bid)
      if (dep) setReturnedDepositAmount(parseFloat(dep))
      if (email) setReturnedEmail(decodeURIComponent(email))
      if (name) setReturnedName(decodeURIComponent(name))
      
      if (bid) {
        console.log('[WIDGET] Going to deposit step')
        setTimeout(() => setStep('deposit'), 100)
      } else if (ref) {
        console.log('[WIDGET] Going to confirmation step')
        setTimeout(() => setStep('confirmation'), 100)
      }
      
      const keep = new URLSearchParams()
      if (params.get('lang')) keep.set('lang', params.get('lang')!)
      if (params.get('category')) keep.set('category', params.get('category')!)
      if (params.get('returnUrl')) keep.set('returnUrl', params.get('returnUrl')!)
      window.history.replaceState({}, '', window.location.pathname + '?' + keep.toString())
    }
    
    if (isCanceled) {
      alert(lang === 'fr' ? 'Paiement annulé' : lang === 'es' ? 'Pago cancelado' : 'Payment canceled');
      const keep = new URLSearchParams()
      if (params.get('lang')) keep.set('lang', params.get('lang')!)
      if (params.get('category')) keep.set('category', params.get('category')!)
      if (params.get('returnUrl')) keep.set('returnUrl', params.get('returnUrl')!)
      window.history.replaceState({}, '', window.location.pathname + '?' + keep.toString())
    }
  }, [])"""

if old in content:
    content = content.replace(old, new)
    print("useEffect success reecrit avec setTimeout et logs")
else:
    print("ERREUR: bloc useEffect non trouve!")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
