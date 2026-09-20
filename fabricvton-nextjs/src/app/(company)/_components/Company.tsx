import { delay } from "../_lib/style";

export default function Company() {
  return (
    <section className="fv-section fv-company" id="company" aria-labelledby="company-title">
      <div className="fv-wrap">
        <div className="fv-company-grid">
          <div data-reveal>
            <p className="fv-eyebrow">COMPANY</p>
            <h2 className="fv-h2" id="company-title">
              We started with a hard problem.
            </h2>
          </div>
          <div className="fv-company-copy">
            <p className="fv-lead" data-reveal style={delay(80)}>
              Visual AI can generate remarkable images. But real-world understanding requires more than appearance
              alone.
            </p>
            <p className="fv-body" data-reveal style={delay(140)}>
              FabricVTON was built around the idea that systems should understand structure, materials, people and the
              ways they interact.
            </p>
            <p className="fv-body" data-reveal style={delay(200)}>
              We research the underlying technology and turn that work into products people can use.
            </p>
          </div>
        </div>

        {/* The two-tone thread echoes the mark: fabric beige, then graphite. */}
        <div className="fv-thread" aria-hidden="true" data-reveal="grow">
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}
