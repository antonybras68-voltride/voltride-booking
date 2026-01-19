import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = 'BKRoMFhD4-MNKJzdSoMuzQtq7vZvCQSi7OkVRAL1Yd3EoaTi3Tm5PzAJkgbQnhDgOKHc7bjhYMEtpQlIN51LS9w';
const API_URL = import.meta.env.VITE_API_URL || 'https://api-production-e70c.up.railway.app';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function usePushNotifications() {
  const [state, setState] = useState({ isSupported: false, isSubscribed: false, permission: 'default' as NotificationPermission, loading: false, error: null as string | null });

  useEffect(() => {
    (async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      if (!isSupported) return setState(s => ({ ...s, isSupported: false }));
      let isSubscribed = false;
      try { const reg = await navigator.serviceWorker.ready; isSubscribed = !!(await reg.pushManager.getSubscription()); } catch {}
      setState({ isSupported: true, isSubscribed, permission: Notification.permission, loading: false, error: null });
    })();
  }, []);

  const subscribe = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return setState(s => ({ ...s, permission: perm, loading: false, error: 'Permission refusee' })), null;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
      await fetch(`${API_URL}/api/push/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub }) });
      setState(s => ({ ...s, isSubscribed: true, permission: 'granted', loading: false }));
      return sub;
    } catch { setState(s => ({ ...s, loading: false, error: 'Erreur' })); return null; }
  }, []);

  const unsubscribe = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await fetch(`${API_URL}/api/push/unsubscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
      setState(s => ({ ...s, isSubscribed: false, loading: false }));
    } catch { setState(s => ({ ...s, loading: false })); }
  }, []);

  const sendTest = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Test M&V', { body: 'Notifications OK!', icon: '/icon-192.png' });
  }, []);

  return { ...state, subscribe, unsubscribe, sendTest };
}
