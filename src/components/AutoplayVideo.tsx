"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type VideoHTMLAttributes,
} from "react";
import { Play } from "lucide-react";

type Props = VideoHTMLAttributes<HTMLVideoElement> & {
  active?: boolean;
};

const RETRY_DELAYS = [0, 120, 450, 1100, 2200];

function localPosterFor(source: VideoHTMLAttributes<HTMLVideoElement>["src"], explicitPoster?: string) {
  if (explicitPoster) return explicitPoster;
  if (typeof source !== "string" || !source.startsWith("/uploads/")) return undefined;
  return source.replace(/\.(mp4|mov)(\?.*)?$/i, ".poster.webp$2");
}

export default function AutoplayVideo({ active = true, className = "", poster, ...props }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const resolvedPoster = localPosterFor(props.src, poster);
  const retryTimers = useRef<number[]>([]);
  const inViewRef = useRef(true);
  const [blocked, setBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);

  const clearRetries = useCallback(() => {
    retryTimers.current.forEach((timer) => window.clearTimeout(timer));
    retryTimers.current = [];
  }, []);

  const prepareVideo = useCallback((video: HTMLVideoElement) => {
    // Definir também como propriedades/atributos é importante no Safari móvel,
    // que decide a elegibilidade do autoplay antes do primeiro play().
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;
    video.controls = false;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("x5-playsinline", "");
    video.setAttribute("disablepictureinpicture", "");
  }, []);

  const requestPlayback = useCallback(async (fromUserGesture = false) => {
    const video = ref.current;
    if (!video || !active || !inViewRef.current || document.visibilityState === "hidden") return false;

    prepareVideo(video);

    try {
      await video.play();
      setPlaying(true);
      setBlocked(false);
      return true;
    } catch {
      setPlaying(false);
      if (fromUserGesture) setBlocked(true);
      return false;
    }
  }, [active, prepareVideo]);

  const schedulePlaybackRetries = useCallback(() => {
    clearRetries();
    setBlocked(false);

    RETRY_DELAYS.forEach((delay, index) => {
      const timer = window.setTimeout(() => {
        void requestPlayback().then((started) => {
          if (!started && index === RETRY_DELAYS.length - 1) setBlocked(true);
        });
      }, delay);
      retryTimers.current.push(timer);
    });
  }, [clearRetries, requestPlayback]);

  useLayoutEffect(() => {
    const video = ref.current;
    if (video) prepareVideo(video);
  }, [prepareVideo, props.src]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (!active) {
      clearRetries();
      video.pause();
      setPlaying(false);
      setBlocked(false);
      return;
    }

    const onReady = () => schedulePlaybackRetries();
    const onPlaying = () => {
      clearRetries();
      setPlaying(true);
      setBlocked(false);
    };
    const onPause = () => {
      setPlaying(false);
      if (active && inViewRef.current && document.visibilityState === "visible") schedulePlaybackRetries();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") schedulePlaybackRetries();
      else video.pause();
    };
    const onPageShow = () => schedulePlaybackRetries();
    const onFirstInteraction = () => {
      // Quando o navegador bloqueia autoplay (ex.: economia de bateria), a primeira
      // interação do usuário libera a reprodução sem exigir um segundo toque no vídeo.
      void requestPlayback(true);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      inViewRef.current = entry.isIntersecting && entry.intersectionRatio > 0.15;
      if (inViewRef.current) schedulePlaybackRetries();
      else {
        clearRetries();
        video.pause();
      }
    }, { threshold: [0, 0.15, 0.5] });

    observer.observe(video);
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("touchstart", onFirstInteraction, { passive: true, once: true });
    document.addEventListener("pointerdown", onFirstInteraction, { passive: true, once: true });

    prepareVideo(video);
    if (video.readyState === 0) video.load();
    schedulePlaybackRetries();

    return () => {
      clearRetries();
      observer.disconnect();
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("touchstart", onFirstInteraction);
      document.removeEventListener("pointerdown", onFirstInteraction);
    };
  }, [active, clearRetries, prepareVideo, props.src, requestPlayback, schedulePlaybackRetries]);

  return (
    <>
      <video
        {...props}
        ref={ref}
        className={`${className} autoplay-video-media ${playing ? "is-playing" : "is-paused"}`.trim()}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={resolvedPoster}
        controls={false}
        disablePictureInPicture
        aria-hidden={props["aria-label"] ? undefined : true}
      />
      {active && blocked && (
        <button
          type="button"
          className="autoplay-video-fallback"
          onClick={() => void requestPlayback(true)}
          aria-label="Reproduzir vídeo"
        >
          <Play aria-hidden="true" />
          <span>Reproduzir</span>
        </button>
      )}
    </>
  );
}
