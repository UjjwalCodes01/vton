import Link from "next/link";
import { Cite } from "../../../_components/Blocks";
import { PoseRow } from "../../../_figures/Figures";

export const refs = ["openpose", "densepose", "dwpose", "schp", "mvvton", "fwgan", "tunnel", "idmvton"];

export const toc = [
  { id: "why-drift", label: "Why generations drift" },
  { id: "pose-conditioning", label: "Pose as a condition" },
  { id: "views-and-video", label: "Multiple views and video" },
  { id: "toward-consistency", label: "Toward consistent garments" },
];

const C = ({ k }: { k: string | string[] }) => <Cite k={k} keys={refs} />;

export function Body() {
  return (
    <>
      <p>
        Most try-on research is judged one image at a time. Most shopping is not. A product page shows the garment from the
        front, the side and the back; people turn in front of a mirror; video is increasingly how clothes are shown. If a
        try-on is right in one pose and subtly different in the next, with the print shifted, the colour a little warmer and
        the hem at a different height, people stop trusting all of the images, including the good one.
      </p>
      <PoseRow n="Figure 1" />

      <h2 id="why-drift">Why generations drift</h2>
      <p>Diffusion models are stochastic, and try-on inherits that. Three things make consistency hard:</p>
      <ul>
        <li>
          <strong>Independent sampling.</strong> Each image starts from its own random noise. Small details, the ones that
          are not strongly pinned by the inputs, come out slightly different every time.
        </li>
        <li>
          <strong>Hidden regions.</strong> A product photo usually shows the front. When the person turns, the model has to
          invent the side seam, the back and the inside of a sleeve, and it can invent them differently in every view.
        </li>
        <li>
          <strong>Nothing ties the views together.</strong> In the simplest setup, each pose is its own independent request.
          Nothing in the model knows that the previous image exists.
        </li>
      </ul>

      <h2 id="pose-conditioning">Pose as a condition</h2>
      <p>
        Try-on models are told where the body is through pose and body representations computed from the person photo.
        Common choices include 2D keypoints from systems such as OpenPose <C k="openpose" />, whole-body keypoints from
        DWPose <C k="dwpose" />, dense correspondence from DensePose, which maps image pixels to a 3D body surface{" "}
        <C k="densepose" />, and human parsing to decide which regions are clothing <C k="schp" />.
      </p>
      <p>
        These signals are essential, and they are good at what they do. But they describe the body, not the garment. They
        make sure the sleeve is on the arm in every pose; they do not make sure it is the same sleeve.
      </p>

      <h2 id="views-and-video">Multiple views and video</h2>
      <p>Research on consistency has approached it from two sides.</p>
      <ul>
        <li>
          <strong>Multi-view try-on.</strong> MV-VTON dresses a person seen from any viewpoint, using both front and back
          images of the garment, so that the back of the garment is taken from the product rather than invented{" "}
          <C k="mvvton" />.
        </li>
        <li>
          <strong>Video try-on.</strong> FW-GAN generated try-on video from a person, a garment and a pose sequence, using
          optical flow to warp earlier frames forward <C k="fwgan" />. More recently, Tunnel Try-on focuses a diffusion
          model on a smoothed region that follows the clothing through the video, to keep detail and keep motion coherent{" "}
          <C k="tunnel" />.
        </li>
      </ul>
      <p>
        Video makes the problem visible in a way still images do not. A small difference between two photos might go
        unnoticed; the same difference between consecutive frames is flicker.
      </p>

      <h2 id="toward-consistency">Toward consistent garments</h2>
      <p>The direction we find most promising is to treat the garment as one thing, computed once and reused everywhere:</p>
      <ul>
        <li>
          <strong>A shared garment representation.</strong> Encode the product once and feed the same features to every
          view. Architectures with a dedicated garment branch, such as IDM-VTON’s garment UNet, already separate the garment
          from the person in a way that makes this natural <C k="idmvton" />.
        </li>
        <li>
          <strong>Condition views on each other.</strong> Let later views see earlier ones, so that anything the model had
          to invent is invented once.
        </li>
        <li>
          <strong>Measure sets, not samples.</strong> Compare garment regions across all views of one outfit, and measure
          flicker in video, alongside the usual single-image scores.
        </li>
      </ul>
      <p>
        Consistency is one of our four <Link href="/research/open-problems">open problems</Link>. It is also the one most tied
        to where shopping is going, toward more angles, more motion and more video.
      </p>
    </>
  );
}
