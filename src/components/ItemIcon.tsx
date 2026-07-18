import { useState } from "react";
import { displayName, iconOf } from "../format";

interface Props {
  prefab: string;
  size?: number;
  /** What to show when there is no art: 'placeholder' = "?" box, 'name' = the item name. */
  fallback?: "placeholder" | "name";
  variant?: "plain" | "square" | "bare" | "forbidden";
}

/**
 * Game-art icon for an item/dish.
 * Falls back (per `fallback`) when there is no art in the manifest OR when the
 * image file fails to load at runtime (404, network error).
 */
export default function ItemIcon({
  prefab,
  size = 36,
  fallback = "placeholder",
  variant = "plain",
}: Props) {
  const src = iconOf(prefab);
  const [failed, setFailed] = useState(false);
  const label = displayName(prefab);
  const hasArt = Boolean(src && !failed);
  const frameClass =
    variant === "square"
      ? "item-icon-square"
      : variant === "forbidden"
        ? "item-icon-forbidden"
        : "item-icon-plain";

  if (variant !== "bare") {
    return (
      <span
        className={frameClass}
        title={label}
        aria-label={label}
        style={{ width: size, height: size }}
      >
        {hasArt ? (
          <img
            src={`${import.meta.env.BASE_URL}${src}`}
            alt={label}
            width={Math.round(size * 0.78)}
            height={Math.round(size * 0.78)}
            loading="lazy"
            onError={() => setFailed(true)}
            style={{ imageRendering: "auto", objectFit: "contain" }}
          />
        ) : fallback === "name" ? (
          <span className="item-icon-square-name">{label}</span>
        ) : (
          <span className="item-icon-square-ph" aria-hidden="true">
            ?
          </span>
        )}
      </span>
    );
  }

  if (hasArt) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}${src}`}
        alt={label}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ imageRendering: "auto", objectFit: "contain" }}
      />
    );
  }

  if (fallback === "name") {
    return (
      <span
        className="icon-name icon-name-bare"
        style={{ width: size, height: size }}
        title={label}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className="icon-ph icon-ph-bare"
      role="img"
      aria-label={label}
      title={label}
      style={{ width: size, height: size, fontSize: size * 0.52 }}
    >
      ?
    </span>
  );
}
