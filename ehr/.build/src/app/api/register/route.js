"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const bcryptjs_1 = require("bcryptjs");
const prisma_1 = require("@/lib/prisma");
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    name: zod_1.z.string().min(1),
    role: zod_1.z.enum(["ADMIN", "DOCTOR", "PATIENT"]),
});
async function POST(req) {
    try {
        const body = await req.json();
        const { email, password, name, role } = registerSchema.parse(body);
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return server_1.NextResponse.json({ error: "User already exists" }, { status: 409 });
        }
        const passwordHash = await (0, bcryptjs_1.hash)(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
                role,
            },
        });
        return server_1.NextResponse.json({ message: "User created", userId: user.id }, { status: 201 });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return server_1.NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
        }
        return server_1.NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
