import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/requireAdminUser";

type UptimeRobotMonitor = {
  id: number;
  friendly_name: string;
  url: string;
  status: number;
  all_time_uptime_ratio?: string;
  response_times?: Array<{ value: string }>;
};

export async function GET() {
  try {
   await requireAdminUser();

    const apiKey = process.env.UPTIMEROBOT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Missing UPTIMEROBOT_API_KEY" },
        { status: 500 }
      );
    }

    const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        api_key: apiKey,
        format: "json",
        response_times: "1",
      }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || data?.stat !== "ok") {
      return NextResponse.json(
        {
          success: false,
          message: data?.error?.message || "Failed to fetch UptimeRobot monitors",
        },
        { status: 500 }
      );
    }

    const monitors: UptimeRobotMonitor[] = data.monitors ?? [];

    const parsed = monitors.map((m) => {
      const responseTimeMs = m.response_times?.[0]?.value
        ? Number(m.response_times[0].value)
        : null;

      return {
        id: m.id,
        name: m.friendly_name,
        url: m.url,
        status:
          m.status === 2
            ? "UP"
            : m.status === 9
            ? "DOWN"
            : m.status === 8
            ? "PAUSED"
            : "UNKNOWN",
        responseTimeMs,
        uptimePercent: m.all_time_uptime_ratio
          ? Number(m.all_time_uptime_ratio)
          : null,
      };
    });

    const downCount = parsed.filter((m) => m.status === "DOWN").length;
    const overallStatus = downCount > 0 ? "OUTAGE" : "OPERATIONAL";

    const responseTimes = parsed
      .map((m) => m.responseTimeMs)
      .filter((v): v is number => typeof v === "number");

    const avgResponseMs =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((sum, v) => sum + v, 0) / responseTimes.length
          )
        : 0;

    const uptimes = parsed
  .map((m) => m.uptimePercent)
  .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

const uptimePercent =
  uptimes.length > 0
    ? Math.round(
        (uptimes.reduce((sum, v) => sum + v, 0) / uptimes.length) * 10
      ) / 10
    : null;

    return NextResponse.json({
  success: true,
  health: {
    overallStatus,
    totalMonitors: parsed.length,
    downCount,
    avgResponseMs,
    uptimePercent,
    monitors: parsed,
  },
});
  } catch (error: any) {
    console.error("Platform health error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Server error" },
      { status: 500 }
    );
  }
}