'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, BellRing } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function PushOptIn() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') {
        toast.error('Notifications were not enabled');
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error('Push notifications are not configured yet');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error('Please sign in to enable notifications');
        return;
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) {
        toast.error('Failed to enable notifications');
        return;
      }

      toast.success("Notifications enabled — we'll let you know about your orders.");
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong enabling notifications');
    } finally {
      setLoading(false);
    }
  };

  if (!supported || permission === 'granted') return null;

  return (
    <button
      onClick={handleEnable}
      disabled={loading || permission === 'denied'}
      className="card-luxe flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {permission === 'denied' ? (
        <Bell className="h-5 w-5 shrink-0 text-muted-foreground" />
      ) : (
        <BellRing className="h-5 w-5 shrink-0 text-accent" />
      )}
      <div>
        <p className="text-sm font-medium">
          {permission === 'denied' ? 'Notifications blocked' : 'Enable order notifications'}
        </p>
        <p className="text-xs text-muted-foreground">
          {permission === 'denied'
            ? 'You blocked notifications for this site — re-enable them in your browser settings if you change your mind.'
            : "Get notified the moment your order ships, without checking your email."}
        </p>
      </div>
    </button>
  );
}
