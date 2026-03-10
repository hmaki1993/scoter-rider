import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, region',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get VAPID keys from environment
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

        if (!vapidPublicKey || !vapidPrivateKey) {
            console.error('Missing VAPID keys in environment');
            throw new Error('Push configuration missing');
        }

        webpush.setVapidDetails(
            'mailto:admin@healysystem.com',
            vapidPublicKey,
            vapidPrivateKey
        );

        const { receiver_id, action, call_type, caller_id, conversation_id } = await req.json();

        if (!receiver_id || !action) {
            throw new Error('Missing required fields');
        }

        // Get receiver's push subscription
        const { data: profile, error: profileErr } = await supabaseClient
            .from('profiles')
            .select('push_subscription')
            .eq('id', receiver_id)
            .single();

        if (profileErr || !profile || !profile.push_subscription) {
            console.log('No push subscription found for user', receiver_id);
            return new Response(JSON.stringify({ success: false, message: 'No subscription' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const subscription = profile.push_subscription;

        // Get caller info if it's an incoming call
        let callerName = 'Someone';
        let callerAvatar = '';

        if (action === 'incoming' && caller_id) {
            const { data: caller } = await supabaseClient
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', caller_id)
                .single();
            if (caller) {
                callerName = caller.full_name;
                callerAvatar = caller.avatar_url || '';
            }
        }

        const payload = JSON.stringify({
            type: action === 'incoming' ? 'incoming_call' : 'call_ended',
            call_type: call_type || 'audio',
            caller_name: callerName,
            caller_avatar: callerAvatar,
            conversation_id: conversation_id
        });

        // Send push
        try {
            await webpush.sendNotification(subscription, payload);
            console.log('[Push] Successfully delivered to push service');
        } catch (pushErr: any) {
            console.error('[Push] Error sending notification:', pushErr);
            // If the subscription is no longer valid, we should probably clear it
            if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                console.log('[Push] Subscription expired or not found. Clearing from DB.');
                await supabaseClient.from('profiles').update({ push_subscription: null }).eq('id', receiver_id);
            }
            throw pushErr;
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (err: any) {
        console.error('Edge Function Error:', err);
        return new Response(JSON.stringify({
            error: err.message,
            stack: err.stack,
            details: err.details || 'No additional details'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
