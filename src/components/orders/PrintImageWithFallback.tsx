"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  fallback: React.ReactNode;
};

export function PrintImageWithFallback({ src, alt = "", className, fallback }: Props) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <>{fallback}</>;
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setErrored(true)}
        aria-hidden={!alt}
      />
    </>
  );
}
