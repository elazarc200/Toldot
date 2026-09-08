export function DesignIcon({ kind }: { kind: "search" | "arrow" | "map" | "people" | "time" | "menu" }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    arrow: <path d="M20 12H4m6-6-6 6 6 6"/>,
    map: <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>,
    people: <><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 8v4M5 15v-3h14v3"/></>,
    time: <path d="M5 3v18m-2-4h4m-4-5h4M3 7h4M11 5h9m-9 7h6m-6 7h9"/>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}
