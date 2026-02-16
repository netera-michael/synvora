import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "readline";

const prisma = new PrismaClient();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
    console.log("Creating new Admin User...");

    const email = await question("Enter email: ");
    if (!email) {
        console.error("Email is required.");
        process.exit(1);
    }

    const name = await question("Enter name: ");

    const passwordInput = await question("Enter password: ");
    if (!passwordInput) {
        console.error("Password is required.");
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(passwordInput, 10);

    try {
        const user = await prisma.user.create({
            data: {
                email,
                name: name || "Admin User",
                password: hashedPassword,
                role: "ADMIN"
            }
        });

        console.log(`\n✅ Admin user created successfully:`);
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
    } catch (error) {
        console.error("\n❌ Error creating user:", error);
    } finally {
        await prisma.$disconnect();
        rl.close();
    }
}

main();
