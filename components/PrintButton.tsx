'use client';
export default function PrintButton({ label }: { label: string }) {
  return <button className="btn primary noprint" onClick={() => window.print()}>{label}</button>;
}
