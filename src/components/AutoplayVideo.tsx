"use client";

import { useEffect, useRef, type VideoHTMLAttributes } from "react";

type Props = VideoHTMLAttributes<HTMLVideoElement> & {
  active?: boolean;
};

export default function AutoplayVideo({ active = true, ...props }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const start = () => {
      if (!active) {
        video.pause();
        return;
      }
      const result = video.play();
      if (result) void result.catch(() => undefined);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else video.pause();
    };

    start();
    video.addEventListener("loadedmetadata", start);
    video.addEventListener("canplay", start);
    window.addEventListener("pageshow", start);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      video.removeEventListener("loadedmetadata", start);
      video.removeEventListener("canplay", start);
      window.removeEventListener("pageshow", start);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active, props.src]);

  return (
    <video
      {...props}
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      controls={false}
      disablePictureInPicture
    />
  );
}
