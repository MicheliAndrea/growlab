"use client";

import { useParams } from "next/navigation";

import { ZoneDetail } from "@/components/zones/zone-detail";

export default function ZoneDetailPage() {
  const { id } = useParams<{ id: string }>();

  return <ZoneDetail zoneId={id} />;
}
