=== Clothsy AI – Virtual Try-On for WooCommerce ===
Contributors: clothsyai
Tags: virtual try-on, try on, fitting room, fashion, woocommerce
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.2.5
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Let shoppers see your clothes on themselves before they buy. Adds an AI virtual try-on button to your product pages.

== Description ==

Clothsy AI adds a "Try It On" button to your WooCommerce product pages. A shopper uploads a photo and sees themselves wearing the product — no dressing room needed. That builds confidence to buy, and helps cut returns.

* **Works with any theme.** The button appears below Add to cart automatically, or place it yourself with the Clothsy AI Try-On Button block or the `[clothsy_ai_tryon]` shortcode.
* **Variable products.** When a shopper picks a colour, they try on that colour.
* **Per-product control.** Turn try-on off for any product, or tell Clothsy AI whether it's a top, bottom, dress, outerwear or shoes.
* **Usage at a glance.** See try-ons and your remaining monthly allowance inside WordPress.
* **Built for speed.** Nothing loads until a shopper reaches for the button, and photos go straight to Clothsy AI, never through your web server.
* **A try-on window shoppers finish.** It sits in the corner so the product stays in view: upload a photo or take one with the camera, watch the progress, then add to cart, share the look, or reopen any past try-on.
* **No email required.** The try-on never asks shoppers for an email address, so there is nothing extra to ask consent for and nothing extra to protect.
* **Consent before any photo is sent.** Shoppers are shown, in plain language, what happens to their photo and agree once before anything leaves their browser.
* **Privacy tools built in.** Shopper data works with WordPress's Export and Erase Personal Data tools, and the plugin suggests text for your privacy policy.
* **Safe on staging.** A copy of your site keeps try-on switched off, so it can't use your allowance or disconnect your live store.
* **No account to create.** Click Connect in WordPress and you're done.

= Plans =

Every store starts on the free **Basic** plan with 15 try-ons a month. Paid plans add more, billed monthly in USD, and you can change or cancel them any time from **WooCommerce → Clothsy AI**:

* **Starter** – 250 try-ons a month, $19.99/month
* **Growth** – 750 try-ons a month, $49.99/month
* **Pro** – 2,000 try-ons a month, $99.99/month
* **Scale** – 4,250 try-ons a month, $199/month

Need more than that? Ask us about a Custom plan.

Upgrades start right away with a full allowance. Downgrades and cancellations take effect when your current billing period ends. When the month's allowance is used up, the try-on button tells shoppers to come back later; you are never charged extra.

== Installation ==

1. Install and activate the plugin. WooCommerce must be active.
2. Go to **WooCommerce → Clothsy AI** and click **Connect store**. Your site must be publicly reachable while you connect, because Clothsy AI calls it back once to confirm you own it.
3. Visit a product page — the try-on button appears below Add to cart.

To change a product's settings, open it in the editor and use the **Clothsy AI** tab: you can turn try-on off for that product, or set its garment type (top, bottom, dress, outerwear, shoes).

== Frequently Asked Questions ==

= Do shopper photos get stored? =

No. Photos are processed to create the try-on image and are not kept by Clothsy AI or by your site. The generated try-on image is not kept either, unless the shopper chooses to share it: a shared look keeps a copy of the image on a Clothsy AI page for 30 days, then it is deleted.

= Do shoppers have to agree before their photo is used? =

Yes. Before the first try-on, the window explains what happens to the photo and asks the shopper to agree. Nothing leaves their browser until they do, and the consent is recorded with the date so you have a record of it.

= Does it work with block themes and page builders? =

Yes. Add the **Clothsy AI Try-On Button** block to your single product template, or use the `[clothsy_ai_tryon]` shortcode, and set Placement to "Manually" in the plugin settings.

= How do I handle a shopper's request to see or delete their data? =

Use WordPress's **Tools → Export Personal Data** and **Tools → Erase Personal Data**. Clothsy AI's data is included automatically, including anything captured before the try-on stopped asking for email addresses.

= What happens if I disconnect or delete the plugin? =

The try-on button disappears and any paid plan is cancelled, running to the end of the period you paid for. Your leads and statistics are kept for 30 days, so reconnecting the same site brings them back; after that they are deleted.

= I use a staging site. =

A copy of your site keeps try-on switched off, so it can't use your allowance. If you move your store to a new address, the plugin offers to move the connection.

== Screenshots ==

1. The try-on window on a product page: the shopper uploads a photo and sees themselves wearing the product.
2. WooCommerce → Clothsy AI: connection, on/off switch and this month's usage.
3. Plans: upgrade, downgrade or cancel from WordPress.
4. Button settings: text, colours, shape and placement.
5. The Clothsy AI tab in the product editor.

== External services ==

This plugin relies on the Clothsy AI service (hosted at fabricvton-api.onrender.com) to generate try-on images, store your leads and usage statistics, and manage your plan. Nothing is sent until you click Connect store. After that, data is sent in these cases:

* **When you click Connect store:** your site URL, site name, the site admin email address, and the plugin version. The service then requests one URL on your site to confirm the connection.
* **When an admin opens the Clothsy AI screen, changes the on/off setting, downloads leads, or disconnects:** your store ID and the request details. Requests are signed with a secret that never leaves your server.
* **When you choose or cancel a plan:** your store ID and the chosen plan. You pay on a Clothsy AI checkout page, where payments are handled by a payment processor that Clothsy AI uses; card details are never sent to your site or to Clothsy AI.
* **When an admin runs Export or Erase Personal Data for an email address:** that email address, so Clothsy AI can return or delete the data it holds for it.
* **When you delete the plugin:** your store ID, so Clothsy AI disconnects the store.
* **When a shopper uses the try-on:** nothing is sent until the shopper agrees, in a card explaining what happens to their photo, that they are 18 or older (or have their guardian's consent). Only then does the browser send the photo, an anonymous session ID, the product's name and image URL, and a record of the consent they gave. Shoppers are never asked for an email address. When the try-on window opens, an anonymous "opened" event is sent for your statistics; if a shopper rates a result, that rating is sent too. If a shopper chooses to share a look, the try-on's ID and the product's name, link and image are sent, and Clothsy AI keeps a copy of that try-on image on the shared page for 30 days.

Try-on images are generated with an AI image-processing sub-processor that Clothsy AI uses. Photos are processed only to produce the result, are not kept, and are not used to train AI models. Generated images are not kept unless the shopper shares the look, in which case the shared copy is deleted after 30 days.

The service is provided by Clothsy AI: [Terms of Service](https://www.fabricvton.com/tos), [Privacy Policy](https://www.fabricvton.com/privacy), [Shopper privacy notice](https://www.fabricvton.com/widget-privacy).

== Changelog ==

= 0.2.5 =
* Security hardening and accurate privacy text; rating button fixed.

= 0.2.4 =
* Sharing a look now gives a short link on Clothsy AI's own domain, with the product and a button to buy it. Shared looks are deleted after 30 days.
* Try-on images are now served from Clothsy AI.

= 0.2.3 =
* Redesigned try-on window: it docks in the corner of the page instead of covering it, keeps a history of the shopper's looks, and adds sharing and a one-tap rating.
* Consent is asked once, in plain language, and still recorded with every try-on.
* The try-on no longer asks shoppers for an email address at all.
* "Take a photo" now opens the camera inside the window on laptops as well as phones.
* Add to cart from the result screen now reports what actually happened, and says why when a store refuses an item.
* The window keeps one height throughout, carries Clothsy AI branding, and was tuned for phones, tablets and sideways screens.

= 0.2.1 =
* Shoppers now give explicit consent before any photo is sent, with a plain-language notice and an age confirmation. The consent is recorded and shown in personal data exports.
* Redesigned try-on window: take a photo as well as upload one, confirm it before it is sent, follow the progress step by step, compare the result against the original, and add the product to the cart from the result screen.

= 0.1.0 =
* First release: connect, try-on button (automatic, block and shortcode), variable product support, per-product settings, usage and leads export, paid plans, and WordPress privacy tools.
