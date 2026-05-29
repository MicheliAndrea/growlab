"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadCsvFile, downloadJsonFile } from "@/lib/export";

export function ExportButton({
  jsonFilename,
  csvFilename,
  data,
  csvRows,
}: {
  jsonFilename: string;
  csvFilename: string;
  data: unknown;
  csvRows: Record<string, unknown>[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => downloadJsonFile(jsonFilename, data)}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        JSON
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => downloadCsvFile(csvFilename, csvRows)}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        CSV
      </Button>
    </div>
  );
}
