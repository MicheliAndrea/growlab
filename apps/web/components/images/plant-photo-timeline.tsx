"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  EmptyState,
  formatDateTime,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import { plantImageFileUrl, type PlantImage } from "@/lib/api";

type TimelineImage = PlantImage & {
  plantName?: string;
};

export function PlantPhotoTimeline({
  images,
  title = "Photo timeline",
  emptyTitle = "No plant photos",
}: {
  images: TimelineImage[];
  title?: string;
  emptyTitle?: string;
}) {
  if (images.length === 0) {
    return <EmptyState title={emptyTitle} />;
  }

  const ordered = [...images].sort((left, right) => {
    const leftTime = new Date(left.capturedAt ?? left.uploadedAt).getTime();
    const rightTime = new Date(right.capturedAt ?? right.uploadedAt).getTime();
    return rightTime - leftTime;
  });

  return (
    <div className="grid gap-3">
      <div className="text-sm font-medium">{title}</div>
      <RowList>
        {ordered.map((image) => (
          <Row
            key={image.id}
            title={image.plantName ?? image.originalFilename ?? "Plant image"}
            detail={formatDateTime(image.capturedAt ?? image.uploadedAt)}
            meta={<StatusBadge value={image.growthStage ?? "growth-tracked"} />}
          >
            <Link
              className="shrink-0 overflow-hidden rounded-md border border-border"
              href={`/plants/${image.plantId}`}
            >
              <img
                alt={image.originalFilename ?? "Plant image"}
                className="h-16 w-24 object-cover"
                src={plantImageFileUrl(image.id)}
              />
            </Link>
            <div className="grid gap-1">
              {image.tags && image.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {image.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {image.growthTracking ? (
                <div className="max-w-full truncate text-xs text-muted-foreground">
                  Growth tracking present
                </div>
              ) : (
                <div className="max-w-full truncate text-xs text-muted-foreground">
                  Uploaded {formatDateTime(image.uploadedAt)}
                </div>
              )}
            </div>
          </Row>
        ))}
      </RowList>
    </div>
  );
}
