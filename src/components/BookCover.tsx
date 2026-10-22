type Props = {
  src?: string | null;
  title: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "h-20 w-14",
  md: "h-36 w-24",
  lg: "h-52 w-36",
};

export function BookCover({ src, title, className = "", size = "md" }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-sm bg-[linear-gradient(145deg,#3d4a36,#2a3324)] text-paper shadow-[var(--shadow)] ${sizes[size]} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Okładka: ${title}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-2">
          <div className="h-px w-full bg-brass/50" />
          <p className="font-display text-[0.65rem] leading-tight line-clamp-4">
            {title}
          </p>
          <div className="h-px w-full bg-brass/50" />
        </div>
      )}
    </div>
  );
}
