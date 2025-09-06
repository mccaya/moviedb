const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface SignupWebhookPayload {
  email: string;
  user_id: string;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const payload: SignupWebhookPayload = await req.json();
    console.log('Received signup webhook payload:', payload);

    // Validate required fields
    if (!payload.email || !payload.user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and user_id" }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Configure your webhook URL here
    const WEBHOOK_URL = Deno.env.get('SIGNUP_WEBHOOK_URL');
    
    if (!WEBHOOK_URL) {
      console.error('SIGNUP_WEBHOOK_URL environment variable not configured');
      return new Response(
        JSON.stringify({ error: "Webhook URL not configured" }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Prepare webhook payload
    const webhookPayload = {
      event: 'user.signup',
      data: {
        email: payload.email,
        user_id: payload.user_id,
        created_at: payload.created_at,
        timestamp: new Date().toISOString(),
        source: 'filmfolio'
      }
    };

    console.log('Sending webhook to:', WEBHOOK_URL);
    console.log('Webhook payload:', webhookPayload);

    // Send POST request to webhook URL
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FilmFolio-Webhook/1.0',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      console.error('Webhook request failed:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Webhook request failed",
          status: webhookResponse.status,
          statusText: webhookResponse.statusText
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const webhookResult = await webhookResponse.text();
    console.log('Webhook response:', webhookResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Webhook sent successfully",
        webhook_status: webhookResponse.status
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Error in signup webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});