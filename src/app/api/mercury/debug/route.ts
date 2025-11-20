import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const logs: string[] = [];
    const log = (msg: string) => logs.push(`[${new Date().toISOString()}] ${msg}`);

    try {
        log("Starting Mercury debug (Auth Header Test)...");

        // 1. Check Settings
        const settings = await prisma.mercurySettings.findFirst();
        if (!settings || !settings.apiKey) {
            log("❌ No Mercury settings or API key found");
            return NextResponse.json({ success: false, logs }, { status: 400 });
        }

        const apiKey = settings.apiKey;
        log(`API Key present (length: ${apiKey.length})`);

        // Clean key (remove 'secret-token:' if present for testing variations)
        const cleanKey = apiKey.replace(/^secret-token:/, '');
        log(`Clean key length: ${cleanKey.length}`);

        // Formats to test
        const formats = [
            { name: "Current (secret-token: <key>)", header: apiKey.startsWith('secret-token:') ? apiKey : `secret-token:${apiKey}` },
            { name: "Bearer <clean_key>", header: `Bearer ${cleanKey}` },
            { name: "Bearer secret-token:<clean_key>", header: `Bearer secret-token:${cleanKey}` },
            { name: "Basic Auth (username=secret-token:<clean_key>)", header: `Basic ${Buffer.from(`secret-token:${cleanKey}:`).toString('base64')}` },
            { name: "Basic Auth (username=<clean_key>)", header: `Basic ${Buffer.from(`${cleanKey}:`).toString('base64')}` }
        ];

        const url = "https://api.mercury.com/api/v1/accounts";
        let success = false;

        for (const format of formats) {
            log(`\nTesting format: ${format.name}`);
            log(`Header value: ${format.header.substring(0, 20)}...`);

            try {
                const res = await fetch(url, {
                    headers: {
                        'Authorization': format.header,
                        'Content-Type': 'application/json'
                    }
                });

                log(`Status: ${res.status}`);
                if (res.ok) {
                    log("✅ SUCCESS!");
                    const data = await res.json();
                    log(`Accounts found: ${data.accounts?.length}`);
                    success = true;
                    break; // Stop after first success
                } else {
                    const text = await res.text();
                    log(`❌ Failed: ${text.substring(0, 100)}`);
                }
            } catch (e: any) {
                log(`❌ Exception: ${e.message}`);
            }
        }

        return NextResponse.json({ success, logs });

    } catch (error: any) {
        log(`❌ Unexpected error: ${error.message}`);
        return NextResponse.json({ success: false, logs, error: error.message }, { status: 500 });
    }
}
