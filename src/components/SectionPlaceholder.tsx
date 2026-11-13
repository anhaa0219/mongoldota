import { PageBackdrop } from "@/components/PageBackdrop";

/** On-theme stand-in for sections that are not designed yet. */
export function SectionPlaceholder({ title }: { title: string }) {
  return (
    <>
      <PageBackdrop />
      <div className="flex flex-1 flex-col items-center justify-center gap-[1.5rem] px-5 py-24 text-center">
        <h1 className="title-metal font-display text-[3.5rem] leading-none lg:text-[7rem]">{title}</h1>
        <p className="text-[1.375rem] text-white/70">This section is coming soon.</p>
      </div>
    </>
  );
}
