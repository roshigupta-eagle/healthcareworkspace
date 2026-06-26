"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const auth_1 = require("@/lib/auth");
const server_1 = require("next/server");
exports.default = (0, auth_1.auth)((req) => {
    var _a;
    const { pathname } = req.nextUrl;
    // Public routes
    const publicRoutes = ["/login", "/register", "/api/auth", "/api/register"];
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
        return server_1.NextResponse.next();
    }
    // Check authentication
    if (!req.auth) {
        return server_1.NextResponse.redirect(new URL("/login", req.url));
    }
    // Role-based route protection
    const role = (_a = req.auth.user) === null || _a === void 0 ? void 0 : _a.role;
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
        return server_1.NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/doctor") && role !== "DOCTOR" && role !== "ADMIN") {
        return server_1.NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return server_1.NextResponse.next();
});
exports.config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
