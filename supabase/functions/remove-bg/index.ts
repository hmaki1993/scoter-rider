import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
            }
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const apiKey = Deno.env.get('REMOVEBG_API_KEY');
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'remove.bg API key not configured. Please add REMOVEBG_API_KEY to Supabase secrets.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        // The request body is multipart/form-data with the image file
        const formData = await req.formData();
        const imageFile = formData.get('image_file') as File | null;

        if (!imageFile) {
            return new Response(JSON.stringify({ error: 'No image_file provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Forward to remove.bg
        const removeBgFormData = new FormData();
        removeBgFormData.append('image_file', imageFile);
        removeBgFormData.append('size', 'full');   // Full quality
        removeBgFormData.append('format', 'png');  // Always PNG with transparency

        const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': apiKey,
            },
            body: removeBgFormData,
        });

        if (!removeBgResponse.ok) {
            const errorText = await removeBgResponse.text();
            console.error('[remove-bg] API error:', removeBgResponse.status, errorText);
            return new Response(JSON.stringify({ error: `remove.bg error ${removeBgResponse.status}`, details: errorText }), {
                status: removeBgResponse.status,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Return the transparent PNG to the client
        const resultBuffer = await removeBgResponse.arrayBuffer();
        return new Response(resultBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Access-Control-Allow-Origin': '*',
                'X-Credits-Charged': removeBgResponse.headers.get('X-Credits-Charged') ?? '0',
            }
        });

    } catch (error) {
        console.error('[remove-bg] Unexpected error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});
