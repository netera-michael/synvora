import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MercuryClient } from "@/lib/mercury";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const logs: string[] = [];
    const log = (msg: string) => logs.push(`[${new Date().toISOString()}] ${msg}`);

    try {
        log("Starting Mercury debug...");

        // 1. Check Settings
        const settings = await prisma.mercurySettings.findFirst();
        if (!settings) {
            log("❌ No Mercury settings found in database");
            return NextResponse.json({ success: false, logs }, { status: 400 });
        }

        log(`✅ Settings found. Enabled: ${settings.enabled}`);
        log(`API Key present: ${!!settings.apiKey}`);
        if (settings.apiKey) {
            log(`API Key length: ${settings.apiKey.length}`);
            log(`API Key starts with 'secret-token:': ${settings.apiKey.startsWith("secret-token:")}`);
        }

        if (!settings.apiKey) {
            log("❌ API Key is missing");
            return NextResponse.json({ success: false, logs }, { status: 400 });
        }

        // 2. Initialize Client
        const client = new MercuryClient(settings.apiKey);
        log("Client initialized");

        // 3. Test Connection (Get Accounts)
        log("Attempting to fetch accounts...");
        let accounts: any[] = [];
        try {
            accounts = await client.getAccounts();
            log(`✅ Fetch accounts success. Found ${accounts.length} accounts.`);
            accounts.forEach(acc => log(`- Account: ${acc.name} (${acc.id})`));
        } catch (e: any) {
            log(`❌ Fetch accounts failed: ${e.message}`);
            return NextResponse.json({ success: false, logs, error: e.message }, { status: 500 });
        }

        // 4. Test Transactions (if account exists)
        if (accounts.length > 0) {
            const accountId = accounts[0].id;
            log(`Attempting to fetch transactions for account ${accountId}...`);

            // Default to last 30 days
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);

            try {
                const transactions = await client.getTransactions({
                    accountId,
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0]
                });
                log(`✅ Fetch transactions success. Found ${transactions.length} transactions.`);
                if (transactions.length > 0) {
                    log(`Sample transaction: ${JSON.stringify(transactions[0], null, 2)}`);
                }
            } catch (e: any) {
                log(`❌ Fetch transactions failed: ${e.message}`);
                // Don't fail the whole request if just transactions fail, but report it
            }
        } else {
            log("⚠️ No accounts found, skipping transaction fetch.");
        }

        return NextResponse.json({ success: true, logs });

    } catch (error: any) {
        log(`❌ Unexpected error: ${error.message}`);
        return NextResponse.json({ success: false, logs, error: error.message }, { status: 500 });
    }
}
