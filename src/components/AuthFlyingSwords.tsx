/** Original silhouettes inspired by ornate xianxia weaponry, drawn for the orbit's small scale. */
export const flyingSwords = [
  { name:'Xích Diệm', color:'#f78064', shade:'#702c43', blade:'M0-58 5-39 2-29 7-17 3-9 6 5 2 15-2 15-6 5-3-9-7-17-2-29-5-39Z', guard:'M-16 8-10 21 0 17 10 21 16 8 7 13 0 10-7 13Z', etch:'M0-47 2-32-2-18 2-5 0 12' },
  { name:'Thanh Trúc', color:'#9fe6a1', shade:'#245b4c', blade:'M0-60 3-43 3-21 7-12 3-6 4 14 0 20-4 14-3-6-7-12-3-21-3-43Z', guard:'M0 13Q-19 0-13 24L-5 17 0 21 5 17 13 24Q19 0 0 13Z', etch:'M0-48v61m-3-45h6m-6 17h6m-6 17h6' },
  { name:'Tử Tinh', color:'#d3aeff', shade:'#573774', blade:'M0-59 6-42 2-24 8-12 3 0 6 13 0 20-6 13-3 0-8-12-2-24-6-42Z', guard:'M-17 7-12 23-5 19 0 24 5 19 12 23 17 7 7 13 0 8-7 13Z', etch:'M0-45 3-38 0-30-3-38Zm0 24 4 8-4 8-4-8Z' },
  { name:'Huyền Thiết', color:'#c0d2e4', shade:'#334254', blade:'M0-59 7-44 5-34 8-27 5-20 8-13 5-6 8 3 5 16 0 20-5 16-8 3-5-6-8-13-5-20-8-27-5-34-7-44Z', guard:'M-17 10-17 23-8 19 0 24 8 19 17 23 17 10 7 14 0 10-7 14Z', etch:'M0-46v58m-3-45 6 6-6 7 6 7-6 7 6 7' },
  { name:'Bích Hải', color:'#75dcff', shade:'#185e92', blade:'M0-60 4-42 2-29 7-19 3-12 9-1 4 9 3 17 0 21-3 17-4 9-9-1-3-12-7-19-2-29-4-42Z', guard:'M-18 6Q-16 25-5 18L0 23 5 18Q16 25 18 6L9 14 0 9-9 14Z', etch:'M0-46Q-5-31 0-24T0-5T0 12' },
  { name:'Kim Ô', color:'#ffe29a', shade:'#896034', blade:'M0-60 4-42 3-5 8 2 5 16 0 22-5 16-8 2-3-5-4-42Z', guard:'M0 12-6 8-18 1-12 19-5 21 0 25 5 21 12 19 18 1 6 8Z', etch:'M0-48v58m-3-29 3-5 3 5-3 5Z' },
] as const;

export function AuthFlyingSword({ index, gradientId }: { index:number; gradientId:string }) {
  const sword = flyingSwords[index]!;
  return <g className="ornate-flying-sword" strokeLinejoin="round">
    <path d={sword.blade} fill={`url(#${gradientId})`} stroke={sword.color} strokeWidth=".8" />
    <path d={sword.etch} stroke="#effaff" strokeWidth=".7" fill="none" opacity=".8" />
    <path d={sword.guard} fill={sword.shade} stroke={sword.color} strokeWidth="1.1" />
    <path d="M-2 20h4v21l-2 4-2-4Z" fill={sword.shade} stroke={sword.color} strokeWidth=".8" />
    <path d="m-2 25 4 2m-4 3 4 2m-4 3 4 2" stroke={sword.color} strokeWidth="1" />
    <path d="m0 12 4 5-4 6-4-6Zm0 30 4 4-4 6-4-6Z" fill={sword.color} stroke="#edf9f3" strokeWidth=".6" />
    <path d="M0 52Q-10 60-5 70M2 51Q9 59 4 67" stroke={sword.color} strokeWidth=".9" />
  </g>;
}
