"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UnauthorizedPage;
const jsx_runtime_1 = require("react/jsx-runtime");
function UnauthorizedPage() {
    return ((0, jsx_runtime_1.jsx)("main", { id: "main-content", className: "flex-1 flex items-center justify-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-gray-900", children: "Access Denied" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-gray-600", children: "You do not have permission to access this page." }), (0, jsx_runtime_1.jsx)("a", { href: "/dashboard", className: "mt-4 inline-block text-blue-600 hover:text-blue-500 font-medium", children: "Return to Dashboard" })] }) }));
}
