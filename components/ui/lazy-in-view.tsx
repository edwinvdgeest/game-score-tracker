"use client";

import { useEffect, useRef, useState } from "react";

interface LazyInViewProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
}

/** Renders children only once they scroll into view (IntersectionObserver). */
export function LazyInView({
  children,
  fallback = null,
  rootMargin = "200px",
}: LazyInViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return <div ref={ref}>{inView ? children : fallback}</div>;
}
