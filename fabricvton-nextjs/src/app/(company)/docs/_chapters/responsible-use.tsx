import { Callout, H2, Points, R } from "../_components/Doc";

export const toc = [
  { id: "impact", label: "Broader impact" },
  { id: "guardrails", label: "The guardrail plan" },
  { id: "live", label: "Live-session controls" },
];

export const sources = [69, 111, 119];

export function Body() {
  return (
    <>
      <H2 id="impact" n="6.7">
        Broader impact and responsible use
      </H2>
      <p>
        The programme aims to make a widely deployed technology work for people it currently serves poorly, wherever they
        shop. It does not claim a specific reduction in returns. That claim needs live retail trials, which are outside this
        programme&apos;s scope.
      </p>
      <p>
        Try-on also carries real risks, and live video raises them. It edits images of real people, so it could be misused to
        alter someone&apos;s appearance without consent, to sexualise a photo, or to push a narrow body ideal. FabricVTON has
        written a guardrail plan for photo and live try-on, with eleven guardrails and a tested decision function, enforced in
        a layer that every request must pass <R n={111} />.
      </p>

      <h3 id="guardrails">6.7.1 The main measures</h3>
      <Points
        items={[
          { k: "Minors are never processed.", t: "Two age estimators and a challenge age of 25 mean anyone who may be under 18 is blocked with any garment, in every mode, and no client setting can change this." },
          { k: "Revealing garments are restricted.", t: "Lingerie, swimwear and sheer garments are off for consumers and allowed only for clearly adult, consented catalogue models, with stricter output checks." },
          {
            k: "Inputs and outputs are both screened.",
            t: (
              <>
                Nudity checks on the person and garment photos, output moderation, an age re-check, and a check that the output
                shows no more skin than the garment explains. Research shows harmless-looking garment images can make a try-on
                model produce nudity, so the output check matters most <R n={119} />.
              </>
            ),
          },
          { k: "Known abuse material is hash-matched and reported,", t: "with evidence preserved in a separate, locked account." },
          {
            k: "Consent and provenance.",
            t: (
              <>
                A consent check at every upload and every live session, a block on public figures, and a visible AI label,
                signed Content Credentials and an invisible watermark on every output, in line with Article 50 of the EU AI
                Act <R n={69} /> and India&apos;s 2026 rules on synthetic media.
              </>
            ),
          },
          { k: "Access control and takedown.", t: "Per-client keys, rate limits, signed jobs so the GPU cannot be reached around the checks, penalties for repeat abuse, and a 2-hour takedown process." },
        ]}
      />

      <H2 id="live" n="6.7.2">
        Live-session controls
      </H2>
      <p>
        Live sessions add their own controls: the age and consent checks run at session start, sessions have a time limit,
        output frames are sampled for moderation throughout, and the stream carries the label and watermark. The fairness
        measures from WP1 are applied to FabricVTON&apos;s image, video and live models before every release, and uploads are
        deleted after each job under a published retention policy.
      </p>
      <Callout label="Our position" tone="accent">
        Guardrails are part of the model, not an add-on. Every model this programme produces will be measured for fairness and
        will pass the same safety layer before it reaches a shopper.
      </Callout>
    </>
  );
}
