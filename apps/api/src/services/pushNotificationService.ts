import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:contact@voltride.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

export const pushNotificationService = {
  async subscribe(endpoint: string, p256dh: string, auth: string, userId?: string, userAgent?: string) {
    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    if (existing) {
      return prisma.pushSubscription.update({
        where: { endpoint },
        data: { p256dh, auth, userId, userAgent, updatedAt: new Date() }
      });
    }
    return prisma.pushSubscription.create({ data: { endpoint, p256dh, auth, userId, userAgent } });
  },

  async unsubscribe(endpoint: string) {
    try {
      await prisma.pushSubscription.delete({ where: { endpoint } });
      return true;
    } catch { return false; }
  },

  async sendToSubscription(subscriptionId: string, payload: PushPayload) {
    const sub = await prisma.pushSubscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw new Error('Subscription non trouvee');
    const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
    try {
      await webpush.sendNotification(pushSub, JSON.stringify(payload));
      return { success: true };
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) await this.unsubscribe(sub.endpoint);
      throw error;
    }
  },

  async sendToUser(userId: string, payload: PushPayload) {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    const results = await Promise.allSettled(subs.map(s => this.sendToSubscription(s.id, payload)));
    return { total: subs.length, success: results.filter(r => r.status === 'fulfilled').length, failed: results.filter(r => r.status === 'rejected').length };
  },

  async sendToAll(payload: PushPayload) {
    const subs = await prisma.pushSubscription.findMany();
    const results = await Promise.allSettled(subs.map(s => this.sendToSubscription(s.id, payload)));
    return { total: subs.length, success: results.filter(r => r.status === 'fulfilled').length, failed: results.filter(r => r.status === 'rejected').length };
  }
};
