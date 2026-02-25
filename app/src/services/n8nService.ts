
/**
 * n8n Integration Service
 * 
 * This service handles communication with n8n workflows via webhooks.
 * It's designed to be fire-and-forget to avoid blocking the user interface.
 */

// Configuration - This will be replaced with your actual n8n webhook URL
// processing env var or hardcoded string
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

export interface N8nPayload {
    event: string;
    timestamp: string;
    data: any;
    source: 'epic-web-app';
}

/**
 * Sends data to n8n webhook
 * @param event The name of the event (e.g., 'student_registered', 'payment_received')
 * @param data The data payload to send
 */
export const sendToN8n = async (event: string, data: any): Promise<boolean> => {
    // If no webhook URL is configured, log warning and return
    if (!N8N_WEBHOOK_URL) {
        console.warn('n8n Webhook URL not configured. Skipping automation.');
        return false;
    }

    const payload: N8nPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
        source: 'epic-web-app'
    };

    try {
        // We use fetch with 'no-cors' mode if needed, or simple POST
        // For n8n, usually standard POST is fine.
        // Using fire-and-forget pattern
        fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }).catch(err => console.error('Error sending to n8n (background):', err));

        return true;
    } catch (error) {
        console.error('Failed to initiate n8n request:', error);
        return false;
    }
};

/**
 * Test function to verify n8n connection
 */
export const testN8nConnection = async () => {
    return sendToN8n('test_connection', { message: 'Hello from your Academy!' });
};
