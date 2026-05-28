"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState, formatDateTime } from "@/components/dashboard/ui";
import { plantImageFileUrl, type PlantImage } from "@/lib/api";

type ImageWithPlant = PlantImage & {
  plantName?: string;
};

export function ImageGallery({ images }: { images: ImageWithPlant[] }) {
  if (images.length === 0) {
    return <EmptyState title="No plant images" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {images.map((image) => (
        <article
          className="overflow-hidden rounded-lg border border-border bg-card"
          key={image.id}
        >
          <div
            aria-label={image.originalFilename ?? "Plant image"}
            className="aspect-[4/3] bg-muted bg-cover bg-center"
            role="img"
            style={{ backgroundImage: `url(${plantImageFileUrl(image.id)})` }}
          />
          <div className="grid gap-2 p-3 text-sm">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <Link
                className="truncate font-medium hover:underline"
                href={`/plants/${image.plantId}`}
              >
                {image.plantName ?? image.originalFilename ?? "Plant image"}
              </Link>
              {image.growthStage ? (
                <Badge variant="secondary">{image.growthStage}</Badge>
              ) : null}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {formatDateTime(image.capturedAt ?? image.uploadedAt)}
            </div>
            {image.tags && image.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {image.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
