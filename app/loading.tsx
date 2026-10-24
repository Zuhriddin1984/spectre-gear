// Shown right away while the next page loads, so a tap never feels ignored.
export default function Loading() {
  return <div className="loading" aria-busy="true"><span className="tally" /></div>;
}
