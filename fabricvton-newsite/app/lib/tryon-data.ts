/**
 * Sample shoppers for the interactive preview. Each shopper is one photo plus six garments and the six
 * pre-rendered try-on results for that shopper (public/tryon/<id>/, built by scripts/prepare-tryon-assets.sh).
 * These are pre-rendered examples, not live generations, and the site says so wherever they appear.
 */

export type ShopperId = "coats" | "denim" | "shirts";

export type Look = {
  id: number;
  name: string;
  /** Crop for the small garment tile: shows the garment, not another retailer's model. */
  tile: { position: string; zoom: number };
};

export type Shopper = {
  id: ShopperId;
  label: string;
  alt: string;
  width: number;
  height: number;
  /** object-position for the shopper photo inside the 3:4 stage. */
  focus: string;
  looks: Look[];
};

const onModel = { position: "50% 85%", zoom: 1.6 };
const flat = { position: "50% 50%", zoom: 1 };

export const SHOPPERS: Record<ShopperId, Shopper> = {
  coats: {
    id: "coats",
    label: "Sample photo 1",
    alt: "A sample shopper photo: a woman in an olive belted trench coat",
    width: 880,
    height: 1216,
    focus: "50% 6%",
    looks: [
      { id: 1, name: "Tan belted trench", tile: flat },
      { id: 2, name: "Grey belted trench", tile: onModel },
      { id: 3, name: "Cream cropped trench", tile: onModel },
      { id: 4, name: "Camel long coat", tile: onModel },
      { id: 5, name: "Long open coat", tile: { position: "50% 70%", zoom: 1.5 } },
      { id: 6, name: "Black double-breasted coat", tile: onModel },
    ],
  },
  denim: {
    id: "denim",
    label: "Sample photo 2",
    alt: "A sample shopper photo: a man in a dark denim jacket",
    width: 880,
    height: 1320,
    focus: "50% 0%",
    looks: [
      { id: 1, name: "Dark denim jacket", tile: onModel },
      { id: 2, name: "Distressed denim jacket", tile: onModel },
      { id: 3, name: "Washed denim jacket", tile: onModel },
      { id: 4, name: "White denim jacket", tile: onModel },
      { id: 5, name: "Burgundy jacket", tile: onModel },
      { id: 6, name: "Denim vest", tile: flat },
    ],
  },
  shirts: {
    id: "shirts",
    label: "Sample photo 3",
    alt: "A sample shopper photo: a man in a green plaid shirt outdoors",
    width: 880,
    height: 1173,
    focus: "50% 0%",
    looks: [
      { id: 1, name: "Printed short-sleeve shirt", tile: onModel },
      { id: 2, name: "Black check shirt", tile: onModel },
      { id: 3, name: "Navy ribbed shirt", tile: flat },
      { id: 4, name: "Sage linen shirt", tile: flat },
      { id: 5, name: "Black graphic tee", tile: { position: "50% 80%", zoom: 1.4 } },
      { id: 6, name: "Tiger graphic tee", tile: onModel },
    ],
  },
};

export const SHOPPER_ORDER: ShopperId[] = ["coats", "denim", "shirts"];

export const personSrc = (s: ShopperId) => `/tryon/${s}/person.webp`;
export const lookSrc = (s: ShopperId, id: number) => `/tryon/${s}/look-${id}.webp`;
export const garmentSrc = (s: ShopperId, id: number) => `/tryon/${s}/garment-${id}.webp`;

export const lookOf = (s: ShopperId, id: number): Look => SHOPPERS[s].looks.find((l) => l.id === id) ?? SHOPPERS[s].looks[0];
