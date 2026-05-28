"use client";

import { useParams } from "next/navigation";

import { PlantDetail } from "@/components/plants/plant-detail";

export default function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();

  return <PlantDetail plantId={id} />;
}
