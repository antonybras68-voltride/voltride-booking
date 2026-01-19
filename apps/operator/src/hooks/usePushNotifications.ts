import { useState, useEffect, useCallback } from 'react';

// Clé publique VAPID (tu devras la générer côté serveur)
// Pour l'instant on met un placeholder
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  permission: NotificationPermission;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    subscription: null,
    permission: 'default'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifie le support et l'état actuel
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      
      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false }));
        return;
      }

      const permission = Notification.permission;
      let subscription: PushSubscription | null = null;

      try {
        const registration = await navigator.serviceWorker.ready;
        subscription = await registration.pushManager.getSubscription();
      } catch (err) {
        console.error('Erreur vérification subscription:', err);
      }

      setState({
        isSupported: true,
        isSubscribed: !!subscription,
        subscription,
        permission
      });
    };

    checkSupport();
  }, []);

  // Demande la permission et s'abonne
  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      setError('Les notifications push ne sont pas supportées');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Demande la permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setError('Permission refusée');
        setState(prev => ({ ...prev, permission }));
        setLoading(false);
        return null;
      }

      // S'abonne aux notifications push
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription,
        permission: 'granted'
      }));

      // Envoie la subscription au serveur (à implémenter)
      console.log('Subscription:', JSON.stringify(subscription));
      // await sendSubscriptionToServer(subscription);

      setLoading(false);
      return subscription;

    } catch (err) {
      console.error('Erreur subscription:', err);
      setError('Erreur lors de l\'abonnement');
      setLoading(false);
      return null;
    }
  }, [state.isSupported]);

  // Se désabonne
  const unsubscribe = useCallback(async () => {
    if (!state.subscription) return;

    setLoading(true);
    setError(null);

    try {
      await state.subscription.unsubscribe();
      
      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null
      }));

      // Notifie le serveur (à implémenter)
      // await removeSubscriptionFromServer(state.subscription);

      setLoading(false);
    } catch (err) {
      console.error('Erreur désabonnement:', err);
      setError('Erreur lors du désabonnement');
      setLoading(false);
    }
  }, [state.subscription]);

  // Envoie une notification de test (locale)
  const sendTestNotification = useCallback(async () => {
    if (Notification.permission !== 'granted') {
      setError('Permission non accordée');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('Test M&V Operator', {
      body: 'Les notifications fonctionnent ! 🎉',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200]
    });
  }, []);

  return {
    ...state,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
}

// Utilitaire pour convertir la clé VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
