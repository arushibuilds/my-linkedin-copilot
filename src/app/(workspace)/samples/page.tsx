import { SamplesManager } from "@/components/SamplesManager";
import { listSamples } from "@/lib/store";

export default function SamplesPage() {
  return <SamplesManager samples={listSamples()} />;
}
