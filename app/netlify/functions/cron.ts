import type { Config } from "@netlify/functions";

export default async function handler() {
  const baseUrl = process.env.URL || "https://liquidlens.uk";
  
  const res = await fetch(`${baseUrl}/api/cron`, {
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
    },
  });

  const data = await res.json();
  console.log("Cron result:", JSON.stringify(data));
  return data;
}

export const config: Config = {
  schedule: "* * * * *",
};
