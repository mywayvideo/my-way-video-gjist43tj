import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          error: "Configuração do Supabase não encontrada",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const upsClientId = await supabase
      .from("secrets")
      .select("value")
      .eq("name", "UPS_CLIENT_ID")
      .single();

    const upsClientSecret = await supabase
      .from("secrets")
      .select("value")
      .eq("name", "UPS_CLIENT_SECRET")
      .single();

    const upsEnvironment = await supabase
      .from("secrets")
      .select("value")
      .eq("name", "UPS_ENVIRONMENT")
      .single();

    if (!upsClientId.data || !upsClientSecret.data || !upsEnvironment.data) {
      return new Response(
        JSON.stringify({
          error: "Credenciais UPS não configuradas no Supabase",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const clientId = upsClientId.data.value;
    const clientSecret = upsClientSecret.data.value;
    const environment = upsEnvironment.data.value;

    const oauthEndpoint =
      environment === "sandbox"
        ? "https://onlinetools-cie.ups.com/security/v1/oauth/token"
        : "https://onlinetools.ups.com/security/v1/oauth/token";

    const authString = btoa(`${clientId}:${clientSecret}`);

    const tokenResponse = await fetch(oauthEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authString}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("UPS OAuth Error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Não foi possível autenticar com UPS",
          details: errorText,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();

    return new Response(JSON.stringify(tokenData), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Erro ao obter token UPS",
        message: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});