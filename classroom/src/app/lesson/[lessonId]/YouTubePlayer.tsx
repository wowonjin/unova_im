"use client";

type Props = {
  /** YouTube video id (e.g. dQw4w9WgXcQ). If omitted, uses NEXT_PUBLIC_YOUTUBE_VIDEO_ID or a default. */
  videoId?: string;
};

export default function YouTubePlayer({ videoId }: Props) {
  const id = videoId || process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_ID || "dQw4w9WgXcQ";
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`;

  return (
    <div className="aspect-video w-full overflow-hidden bg-black">
      <iframe
        className="h-full w-full"
        src={src}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}


