"use client";

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement | null>(null);
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // TEMPORARILY DISABLED to isolate flicker
    // Do not animate on initial mount — only animate on real pathname changes.
    // if (prevPath.current === null) {
    //   prevPath.current = pathname;
    //   return;
    // }
    //
    // // If pathname didn't change, skip animation.
    // if (prevPath.current === pathname) return;
    // prevPath.current = pathname;
    //
    // // add class to trigger the CSS keyframes animation
    // el.classList.add('page-enter-active');
    //
    // const onAnimEnd = () => el.classList.remove('page-enter-active');
    // el.addEventListener('animationend', onAnimEnd);
    //
    // // safety timeout in case animationend doesn't fire
    // const t = setTimeout(onAnimEnd, 900);
    // return () => {
    //   clearTimeout(t);
    //   el.removeEventListener('animationend', onAnimEnd);
    // };
  }, [pathname]);

  return (
    <div ref={ref} className="page-transition">
      {children}
    </div>
  );
}
