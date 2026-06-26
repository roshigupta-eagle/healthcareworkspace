"use client";
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RegisterPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
function RegisterPage() {
    const router = (0, navigation_1.useRouter)();
    const [error, setError] = (0, react_1.useState)("");
    const [loading, setLoading] = (0, react_1.useState)(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const formData = new FormData(e.currentTarget);
        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: formData.get("email"),
                password: formData.get("password"),
                name: formData.get("name"),
                role: formData.get("role"),
            }),
        });
        setLoading(false);
        if (!res.ok) {
            const data = await res.json();
            setError(data.error || "Registration failed");
        }
        else {
            router.push("/login");
        }
    }
    return ((0, jsx_runtime_1.jsx)("main", { id: "main-content", className: "flex-1 flex items-center justify-center px-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "w-full max-w-md", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-center text-gray-900 mb-8", children: "Create an Account" }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-6", noValidate: true, children: [error && ((0, jsx_runtime_1.jsx)("div", { role: "alert", className: "p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md", children: error })), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "name", className: "block text-sm font-medium text-gray-700", children: "Full name" }), (0, jsx_runtime_1.jsx)("input", { id: "name", name: "name", type: "text", autoComplete: "name", required: true, className: "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700", children: "Email address" }), (0, jsx_runtime_1.jsx)("input", { id: "email", name: "email", type: "email", autoComplete: "email", required: true, className: "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-700", children: "Password" }), (0, jsx_runtime_1.jsx)("input", { id: "password", name: "password", type: "password", autoComplete: "new-password", required: true, minLength: 8, className: "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500", "aria-describedby": "password-hint" }), (0, jsx_runtime_1.jsx)("p", { id: "password-hint", className: "mt-1 text-xs text-gray-500", children: "Minimum 8 characters" })] }), (0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Role" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "role", value: "PATIENT", defaultChecked: true, className: "h-4 w-4 text-blue-600 focus:ring-blue-500" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-gray-700", children: "Patient" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "role", value: "DOCTOR", className: "h-4 w-4 text-blue-600 focus:ring-blue-500" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-gray-700", children: "Doctor / Practitioner" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "role", value: "ADMIN", className: "h-4 w-4 text-blue-600 focus:ring-blue-500" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-gray-700", children: "Administrator" })] })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "submit", disabled: loading, className: "w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed", "aria-busy": loading, children: loading ? "Creating account..." : "Register" })] }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-6 text-center text-sm text-gray-600", children: ["Already have an account?", " ", (0, jsx_runtime_1.jsx)(link_1.default, { href: "/login", className: "font-medium text-blue-600 hover:text-blue-500", children: "Sign in" })] })] }) }));
}
