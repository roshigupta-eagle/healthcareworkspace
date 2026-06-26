"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.signOut = exports.signIn = exports.auth = exports.handlers = void 0;
const next_auth_1 = __importDefault(require("next-auth"));
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
const bcryptjs_1 = require("bcryptjs");
const prisma_1 = require("@/lib/prisma");
_a = (0, next_auth_1.default)({
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    providers: [
        (0, credentials_1.default)({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!(credentials === null || credentials === void 0 ? void 0 : credentials.email) || !(credentials === null || credentials === void 0 ? void 0 : credentials.password)) {
                    return null;
                }
                const user = await prisma_1.prisma.user.findUnique({
                    where: { email: credentials.email },
                });
                if (!user)
                    return null;
                const isValid = await (0, bcryptjs_1.compare)(credentials.password, user.passwordHash);
                if (!isValid)
                    return null;
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.id = token.id;
            }
            return session;
        },
    },
}), exports.handlers = _a.handlers, exports.auth = _a.auth, exports.signIn = _a.signIn, exports.signOut = _a.signOut;
