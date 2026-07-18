export default function SectionDivider({ label }: { label: string }) {
  return (
    <div className="divider">
      <span>{label}</span>
    </div>
  );
}
