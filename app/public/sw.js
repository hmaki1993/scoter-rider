// ─── Healy Service Worker v2.1 (Fix: Cold Start Call Recovery) ───────────────
// Industrial-grade background call handling & persistent notifications

let activeCallKeepaliveTimer = null;

// ─── Persistent Call State ─────────────────────────────────────────────────
// We'll try to keep track of the active call status in the SW itself.
let swActiveCall = null;

function broadcastToClients(msg) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage(msg));
    });
}

// ─── Active Call Notification ─────────────────────────────────────────────
function showActiveCallNotification(callerName, callType) {
    swActiveCall = { callerName, callType };
    return self.registration.showNotification(`📞 Call in Progress: ${callerName}`, {
        body: `Tap to return to your ${callType || 'audio'} call`,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'active-call',
        renotify: false,
        requireInteraction: true,   // Essential for background stability
        silent: true,
        data: { url: '/app/communications', type: 'active_call' }
    });
}

function startKeepalive() {
    if (activeCallKeepaliveTimer) return;
    activeCallKeepaliveTimer = setInterval(() => {
        self.clients.matchAll().then(c => {
            if (c.length === 0 && swActiveCall) {
                console.log('[SW] No active clients during call! Attempting to keep alive...');
            }
        });
    }, 4000);
}

function stopKeepalive() {
    if (activeCallKeepaliveTimer) {
        clearInterval(activeCallKeepaliveTimer);
        activeCallKeepaliveTimer = null;
    }
    swActiveCall = null;
}

// ─── Push Handler: The Core ───────────────────────────────────────────────
self.addEventListener('push', (event) => {
    console.log('[SW] Push received', event);

    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
            console.log('[SW] Push Payload:', data);
        } catch (e) {
            console.warn('[SW] Push payload not JSON, using raw text:', event.data.text());
            data = { type: 'incoming_call', caller_name: 'Someone' };
        }
    } else {
        console.warn('[SW] Push received with NO data! Showing generic alert.');
        data = { type: 'incoming_call', caller_name: 'Healy System' };
    }

    const type = data.type || data.action || 'incoming_call';

    if (type === 'incoming_call' || type === 'incoming') {
        const title = `Incoming Call: ${data.caller_name || 'Someone'}`;
        const options = {
            body: `You have an incoming ${data.call_type || 'audio'} call.`,
            icon: data.caller_avatar || '/logo.png', // Premium Caller Avatar
            badge: '/logo.png', // Branded Badge for Status Bar
            tag: 'incoming-call',
            renotify: true,
            requireInteraction: true,
            silent: false, // Ensure it makes sound/vibration
            sound: '/ringtone.mp3', // Premium Custom Sound (if supported)
            vibrate: [
                1000, 500, 1000, 500, 1000, 500, 1000, 500, // Long Ringer Pattern
                1000, 500, 1000, 500, 1000, 500, 1000
            ],
            data: {
                url: '/app/communications',
                conversation_id: data.conversation_id,
                call_id: data.call_id,
                caller_id: data.caller_id,
                call_type: data.call_type || 'audio'
            },
            actions: [
                { action: 'answer', title: '✅ Answer' },
                { action: 'decline', title: '❌ Decline' }
            ]
        };

        event.waitUntil(self.registration.showNotification(title, options));

    } else if (type === 'call_ended' || type === 'ended') {
        event.waitUntil(
            self.registration.getNotifications().then(notifications => {
                notifications.forEach(n => {
                    if (n.tag === 'incoming-call' || n.tag === 'active-call') n.close();
                });
            })
        );
        stopKeepalive();
    }
});

// ─── Message Handler ───────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'CALL_STARTED') {
        showActiveCallNotification(data.callerName, data.callType);
        startKeepalive();
    } else if (data.type === 'CALL_ENDED') {
        self.registration.getNotifications({ tag: 'active-call' }).then(n => n.forEach(x => x.close()));
        stopKeepalive();
    }
});

// ─── Notification Clicks ───────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Clicked:', event.action);
    const data = event.notification.data || {};
    event.notification.close();

    // Build URL with state recovery parameters
    let urlToOpen = new URL(data.url || '/app/communications', self.location.origin);
    if (data.call_id) {
        urlToOpen.searchParams.set('call_id', data.call_id);
        urlToOpen.searchParams.set('caller_id', data.caller_id);
        urlToOpen.searchParams.set('type', data.call_type);
        urlToOpen.searchParams.set('conv_id', data.conversation_id);
    }

    const finalUrlStr = urlToOpen.href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            let target = windowClients.find(c => c.url.includes('/app/'));

            if (target) {
                target.focus();
                if (event.action === 'answer') target.postMessage({ type: 'ACCEPT_CALL_ACTION' });
                else if (event.action === 'decline') target.postMessage({ type: 'REJECT_CALL_ACTION' });
                else if (data.type === 'active_call') target.postMessage({ type: 'FOCUS_CALL' });
                else {
                    // Even if window exists, navigate to the recovery URL to trigger the overlay
                    target.navigate(finalUrlStr);
                }
            } else {
                let openUrl = finalUrlStr;
                if (event.action === 'answer') openUrl += '#action=answer';
                return self.clients.openWindow(openUrl);
            }
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('/__sw_keepalive')) {
        event.respondWith(new Response('ok', { status: 200 }));
    }
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
