import { ModulePage } from "@/components/module-page";

export default function WikiPage() {
  return (
    <ModulePage
      title="Plant wiki"
      subtitle="Internal botanical catalog for families, categories, species, care notes, and links to real plants."
      rows={[
        { label: "Families", value: "ready", tone: "green" },
        { label: "Categories", value: "ready", tone: "green" },
        { label: "Species", value: "editable", tone: "cyan" },
        { label: "History", value: "linked", tone: "amber" }
      ]}
    />
  );
}
