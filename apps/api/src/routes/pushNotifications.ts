import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { pushNotificationService } from '../services/pushNotificationService';

const router = Router();
const prisma = new PrismaClient();

router.get('/vapid-public-key', (req: Request, res: Response) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { subscription, userId } = req.body;
    if (!subscription?.endpoint || !subscription?.keys) return res.status(400).json({ error: 'Subscription invalide' });
    const result = await pushNotificationService.subscribe(subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userId, req.headers['user-agent'] as string);
    res.json({ success: true, subscription: result });
  } catch (error) {
    res.status(500).json({ error: 'Erreur enregistrement' });
  }
});

router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint requis' });
    await pushNotificationService.unsubscribe(endpoint);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur desinscription' });
  }
});

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, title, body, data } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title et body requis' });
    const payload = { title, body, icon: '/icon-192.png', data };
    const result = userId ? await pushNotificationService.sendToUser(userId, payload) : await pushNotificationService.sendToAll(payload);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Erreur envoi' });
  }
});

router.post('/test', async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint requis' });
    const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    if (!sub) return res.status(404).json({ error: 'Subscription non trouvee' });
    await pushNotificationService.sendToSubscription(sub.id, { title: 'Test reussi!', body: 'Les notifications fonctionnent', icon: '/icon-192.png' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur test' });
  }
});

export default router;
