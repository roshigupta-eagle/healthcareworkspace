"use client";

import React from 'react';

export default function AuthenticationErrorState() {
  return (
    <div role="alert" className="p-6 bg-amber-50 border border-amber-200 rounded">
      <h2 className="font-semibold text-amber-800">Authentication error</h2>
      <p className="text-sm text-gray-600 mt-2">
        We could not validate your session. Please try refreshing the page or signing out and signing in again.
      </p>
    </div>
  );
}
