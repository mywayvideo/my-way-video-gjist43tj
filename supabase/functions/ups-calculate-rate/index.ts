import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const {
      origin_zip,
      destination_zip,
      destination_country,
      weight_lbs,
      weight_oz,
      length_in,
      width_in,
      height_in,
      service_type,
    } = await req.json();

    if (
      !origin_zip ||
      !destination_zip ||
      !destination_country ||
      weight_lbs === undefined ||
      !length_in ||
      !width_in ||
      !height_in
    ) {
      return new Response(
        JSON.stringify({
          error: "Parâmetros inválidos para cálculo de frete",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const tokenResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/ups-get-token`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      }
    );

    if (!tokenResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Não foi possível autenticar com UPS",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const ratePayload = {
      RateRequest: {
        Request: {
          RequestOption: "Rate",
          SubVersion: "2205",
        },
        Shipment: {
          Shipper: {
            Address: {
              PostalCode: origin_zip,
              CountryCode: "US",
            },
          },
          ShipTo: {
            Address: {
              PostalCode: destination_zip,
              CountryCode: destination_country,
            },
          },
          Package: {
            PackagingType: {
              Code: "02",
            },
            Dimensions: {
              UnitOfMeasurement: {
                Code: "IN",
              },
              Length: length_in.toString(),
              Width: width_in.toString(),
              Height: height_in.toString(),
            },
            PackageWeight: {
              UnitOfMeasurement: {
                Code: "LBS",
              },
              Weight: weight_lbs.toString(),
            },
          },
        },
      },
    };

    const environment = Deno.env.get("UPS_ENVIRONMENT") || "sandbox";
    const rateEndpoint =
      environment === "sandbox"
        ? "https://onlinetools-cie.ups.com/rating/v2/Shop"
        : "https://onlinetools.ups.com/rating/v2/Shop";

    const rateResponse = await fetch(rateEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ratePayload),
    });

    if (!rateResponse.ok) {
      const errorText = await rateResponse.text();
      console.error("UPS Rate API Error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Não foi possível calcular frete UPS",
          details: errorText,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const rateData = await rateResponse.json();

    const services = rateData.RateResponse?.RatedShipment?.map(
      (shipment: any) => ({
        code: shipment.Service?.Code,
        name: shipment.Service?.Description,
        charge_usd: parseFloat(
          shipment.TotalCharges?.MonetaryValue || "0"
        ),
      })
    ) || [];

    return new Response(JSON.stringify({ services }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Erro ao calcular frete UPS",
        message: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});