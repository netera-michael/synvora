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
        log("Starting Mercury Transaction Fetch Test...");

        // 1. Check Settings
        const settings = await prisma.mercurySettings.findFirst();
        if (!settings || !settings.apiKey) {
            log("❌ No Mercury settings or API key found");
            return NextResponse.json({ success: false, logs }, { status: 400 });
        }

        log("✅ Settings found.");

        // 2. Initialize Client (now uses fixed Auth logic)
        const client = new MercuryClient(settings.apiKey);
        log("Client initialized");

        // 3. Fetch Accounts
        log("Fetching accounts...");
        const accounts = await client.getAccounts();
        log(`✅ Found ${accounts.length} accounts.`);

        if (accounts.length === 0) {
            log("⚠️ No accounts found. Cannot fetch transactions.");
            return NextResponse.json({ success: true, logs });
        }

        // 4. Fetch Transactions for ALL accounts
        // Fetch last 365 days to ensure we get something
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 365);

        let allTransactions: any[] = [];

        for (const account of accounts) {
            log(`Fetching transactions for account: ${account.name} (${account.id})...`);
            try {
                const transactions = await client.getTransactions({
                    accountId: account.id,
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0]
                });
                log(`✅ Fetched ${transactions.length} transactions.`);
                allTransactions = [...allTransactions, ...transactions];
            } catch (e: any) {
                log(`❌ Failed to fetch for ${account.name}: ${e.message}`);
            }
        }

        log(`\nTotal transactions found: ${allTransactions.length}`);

        // Sort by date desc
        allTransactions.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

        // Show latest 10
        const latest10 = allTransactions.slice(0, 10);
        log(`\nLatest ${latest10.length} transactions (across all accounts):`);
        latest10.forEach((tx, i) => {
            log(`[${i + 1}] ${tx.postedAt} | ${tx.amount} | ${tx.counterparty?.name || 'Unknown'} | ${tx.id}`);
        });

        return NextResponse.json({ success: true, logs, transactions: latest10 });

    } catch (error: any) {
        log(`❌ Error: ${error.message}`);
        if (error.cause) {
            log(`Cause: ${JSON.stringify(error.cause)}`);
        }
        return NextResponse.json({ success: false, logs, error: error.message }, { status: 500 });
    }
}
