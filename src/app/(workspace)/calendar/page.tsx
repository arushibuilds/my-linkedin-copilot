import { Calendar } from "@/components/Calendar";
import { PageHeader } from "@/components/ui";
import { listDrafts, listIdeas, listSamples } from "@/lib/store";

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" subtitle="Drag ideas and drafts onto a day. Posted work shows up on the day it went out." />
      <Calendar ideas={listIdeas()} drafts={listDrafts()} sampleTopics={listSamples().map((s) => ({ topic: s.topic, date: s.postedOn }))} />
    </>
  );
}
