const CAMPAIGN_URL =
  "https://unduemedicaldebt.org/campaign/globalshapersaustin-69821/";

function parseMoney(value) {
  return Number(String(value).replace(/[$,]/g, ""));
}

function parseCampaign(html) {
  const match =
    html.match(/\$([\d,.]+)[\s\S]{0,200}?raised of\s*\$([\d,.]+)\s*goal/i) ||
    html.match(/\$([\d,.]+)\s*raised of\s*\$([\d,.]+)\s*goal/i);

  if (!match) {
    throw new Error("Unable to parse campaign totals");
  }

  return {
    raised: parseMoney(match[1]),
    goal: parseMoney(match[2]),
  };
}

module.exports = async function handler(_request, response) {
  try {
    const campaignResponse = await fetch(CAMPAIGN_URL, {
      headers: {
        "user-agent": "GlobalShapersAustinDashboard/1.0",
      },
    });

    if (!campaignResponse.ok) {
      throw new Error(`Campaign fetch failed: ${campaignResponse.status}`);
    }

    const html = await campaignResponse.text();
    const totals = parseCampaign(html);

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
    response.status(200).json({
      ...totals,
      source: CAMPAIGN_URL,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    response.status(502).json({
      error: "Unable to load campaign totals",
      detail: error.message,
    });
  }
};

module.exports.parseCampaign = parseCampaign;
