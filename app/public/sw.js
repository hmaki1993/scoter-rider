// Service Worker for handling Background Call Push Notifications

self.addEventListener('push', function (event) {
    if (!event.data) return;

    try {
        const data = event.data.json();
        console.log('[Service Worker] Push Received.', data);

        if (data.type === 'incoming_call') {
            const title = `Incoming ${data.call_type} call`;
            const options = {
                body: `${data.caller_name} is calling you.`,
                icon: data.caller_avatar || '/logo.png',
                badge: '/logo.png',
                vibrate: [200, 100, 200, 100, 200, 100, 200],
                tag: 'incoming-call',
                renotify: true,
                requireInteraction: true,
                data: {
                    conversation_id: data.conversation_id,
                    url: '/app/communications'
                },
                actions: [
                    { action: 'answer', title: 'Answer' },
                    { action: 'decline', title: 'Decline' }
                ]
            };

            event.waitUntil(self.registration.showNotification(title, options));
        } else if (data.type === 'call_ended') {
            // Close active call notifications
            event.waitUntil(
                self.registration.getNotifications({ tag: 'incoming-call' }).then((notifications) => {
                    notifications.forEach(notification => notification.close());
                })
            );
        }
    } catch (e) {
        console.error('[Service Worker] Error parsing push data', e);
    }
});

self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification click Received.', event);

    event.notification.close();

    const urlToOpen = new URL(event.notification.data.url || '/app/communications', self.location.origin).href;

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        let matchingClient = null;

        for (let i = 0; i < windowClients.length; i++) {
            const windowClient = windowClients[i];
            if (windowClient.url === urlToOpen) {
                matchingClient = windowClient;
                break;
            }
        }

        if (matchingClient) {
            matchingClient.focus();
            // Send action to client if needed
            if (event.action === 'answer') {
                matchingClient.postMessage({ type: 'ACCEPT_CALL_ACTION' });
            } else if (event.action === 'decline') {
                matchingClient.postMessage({ type: 'REJECT_CALL_ACTION' });
            }
        } else {
            // Include action as hash/query param so the app knows what to do when it boots
            let finalUrl = urlToOpen;
            if (event.action === 'answer') finalUrl += '#action=answer';
            if (event.action === 'decline') finalUrl += '#action=decline';
            return clients.openWindow(finalUrl);
        }
    });

    event.waitUntil(promiseChain);
});
