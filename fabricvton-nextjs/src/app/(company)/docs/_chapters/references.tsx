import { DOC_REFS } from "../_data/refs";

export const toc = [];
export const sources: number[] = [];

export function Body() {
  const nums = Object.keys(DOC_REFS)
    .map(Number)
    .sort((a, b) => a - b);
  return (
    <>
      <p className="dx-lede">
        Every source the programme draws on: papers, model cards, licences and official pages. Numbers match the citations
        throughout these docs and in the proposal PDF. Key public figures were re-checked against their primary sources on 30
        September 2026.
      </p>
      <ol className="dx-refs-all">
        {nums.map((k) => {
          const r = DOC_REFS[k];
          return (
            <li key={k} id={`ref-${k}`}>
              <span className="dx-src-n">[{k}]</span>
              <span>
                {r.text}{" "}
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
