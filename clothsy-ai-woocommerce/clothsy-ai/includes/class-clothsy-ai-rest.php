<?php
/**
 * Public endpoints: minting shopper tokens, and answering Clothsy AI's
 * ownership check.
 *
 * @package ClothsyAI
 */

defined( 'ABSPATH' ) || exit;

/**
 * REST routes under clothsy-ai/v1, plus an admin-ajax fallback for sites whose
 * security plugin blocks the REST API for logged-out visitors.
 *
 * Neither route uses a WordPress nonce on purpose: product pages are usually
 * served from a full-page cache, and a nonce baked into cached HTML expires,
 * which would break try-on for exactly the shoppers who hit the cache.
 */
class Clothsy_AI_Rest {

	/** How long a shopper token stays valid. */
	const TOKEN_TTL = 600;

	/** Tokens one visitor address may mint per throttle window. */
	const MINT_LIMIT = 30;

	/** Length of the throttle window, in seconds. */
	const MINT_WINDOW = 600;

	public static function init(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		add_action( 'wp_ajax_clothsy_ai_session', array( __CLASS__, 'ajax_session' ) );
		add_action( 'wp_ajax_nopriv_clothsy_ai_session', array( __CLASS__, 'ajax_session' ) );
	}

	public static function register_routes(): void {
		register_rest_route(
			'clothsy-ai/v1',
			'/session',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'rest_session' ),
				// Public by design: any shopper on a product page may start a try-on.
				'permission_callback' => '__return_true',
				'args'                => array(
					'product_id'   => array(
						'type'     => 'integer',
						'required' => true,
						'minimum'  => 1,
					),
					'variation_id' => array(
						'type'    => 'integer',
						'minimum' => 0,
						'default' => 0,
					),
				),
			)
		);

		register_rest_route(
			'clothsy-ai/v1',
			'/verify',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'rest_verify' ),
				// Called by Clothsy AI's servers, which have no WordPress login.
				'permission_callback' => '__return_true',
				'args'                => array(
					'store'     => array(
						'type'     => 'string',
						'required' => true,
					),
					'challenge' => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);
	}

	/**
	 * POST /clothsy-ai/v1/session
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function rest_session( WP_REST_Request $request ) {
		$result = self::mint( (int) $request['product_id'], (int) $request['variation_id'] );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$response = rest_ensure_response( $result );
		$response->header( 'Cache-Control', 'no-store' );
		return $response;
	}

	/** Same as the REST route, for sites that block REST for logged-out visitors. */
	public static function ajax_session(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- public, cache-safe endpoint; see class docblock.
		$product_id   = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
		$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
		// phpcs:enable
		nocache_headers();
		$result = self::mint( $product_id, $variation_id );
		if ( is_wp_error( $result ) ) {
			$data = $result->get_error_data();
			wp_send_json( array( 'message' => $result->get_error_message() ), is_array( $data ) && isset( $data['status'] ) ? (int) $data['status'] : 400 );
		}
		wp_send_json( $result );
	}

	/**
	 * Builds a signed token for one product (and variation).
	 *
	 * Product details are looked up here, server-side, and signed into the
	 * token: the shopper's browser only says which product it's on. That's what
	 * stops a page visitor from pointing the try-on at an arbitrary image.
	 *
	 * @param int $product_id   Product id.
	 * @param int $variation_id Selected variation id, or 0.
	 * @return array<string, mixed>|WP_Error
	 */
	public static function mint( int $product_id, int $variation_id ) {
		$connection = Clothsy_AI_Settings::connection();
		if ( ! $connection || ! Clothsy_AI_Connection::is_ready() ) {
			return new WP_Error( 'clothsy_ai_unavailable', __( 'Virtual try-on is not available right now.', 'clothsy-ai' ), array( 'status' => 503 ) );
		}

		$product = $product_id ? wc_get_product( $product_id ) : null;
		if ( ! $product || ! self::shopper_can_see( $product ) || ! Clothsy_AI_Product_Meta::is_enabled_for( $product ) ) {
			return new WP_Error( 'clothsy_ai_no_product', __( 'Virtual try-on is not available for this product.', 'clothsy-ai' ), array( 'status' => 404 ) );
		}

		$image_id  = 0;
		$variation = null;
		if ( $variation_id ) {
			$variation = wc_get_product( $variation_id );
			// The variation must belong to this product, or a shopper could mix
			// one product's title with another's image.
			if ( ! $variation || $variation->get_parent_id() !== $product->get_id() || 'publish' !== $variation->get_status() ) {
				return new WP_Error( 'clothsy_ai_bad_variation', __( 'That product option could not be found.', 'clothsy-ai' ), array( 'status' => 404 ) );
			}
			$image_id = (int) $variation->get_image_id();
		}
		if ( ! $image_id ) {
			$image_id = (int) $product->get_image_id();
		}
		$image_url = Clothsy_AI_Product_Meta::image_url( $image_id );
		if ( ! $image_url ) {
			return new WP_Error( 'clothsy_ai_no_image', __( 'This product has no image to try on.', 'clothsy-ai' ), array( 'status' => 422 ) );
		}

		// Counted only once a token is about to be issued, so the checks above
		// stay cheap to fail and don't eat into a real shopper's allowance.
		if ( ! self::within_mint_limit() ) {
			return new WP_Error( 'clothsy_ai_rate_limited', __( 'Too many try-on requests from your connection. Please wait a few minutes and try again.', 'clothsy-ai' ), array( 'status' => 429 ) );
		}

		$claims = array(
			's'   => $connection['store_id'],
			'p'   => (string) $product->get_id(),
			'vid' => $variation ? (string) $variation->get_id() : null,
			't'   => wp_strip_all_tags( $product->get_name() ),
			'i'   => $image_url,
			'c'   => Clothsy_AI_Product_Meta::garment_type( $product ),
			'e'   => time() + self::TOKEN_TTL,
		);
		$payload = Clothsy_AI_Api_Client::base64url( wp_json_encode( $claims ) );
		$token   = $payload . '.' . Clothsy_AI_Api_Client::base64url( hash_hmac( 'sha256', $payload, $connection['secret'], true ) );

		return array(
			'token'     => $token,
			'apiBase'   => untrailingslashit( CLOTHSY_AI_API_BASE ),
			'expiresIn' => self::TOKEN_TTL,
		);
	}

	/**
	 * Whether a logged-out shopper could open this product's page: published,
	 * not hidden from the catalog, and not password-protected. Anything else
	 * (drafts, private or scheduled products, hidden ones) never gets a token.
	 *
	 * @param WC_Product $product Product.
	 */
	private static function shopper_can_see( WC_Product $product ): bool {
		if ( 'publish' !== $product->get_status() ) {
			return false;
		}
		if ( 'hidden' === $product->get_catalog_visibility() ) {
			return false;
		}
		return ! post_password_required( $product->get_id() );
	}

	/**
	 * Cheap per-address throttle on minting, so one visitor can't script the
	 * endpoint to burn through the store's allowance. Counts are kept in a
	 * transient keyed on a hash of the address; the address itself is never
	 * stored. Fixed window: the count resets MINT_WINDOW seconds after the
	 * first mint in it.
	 *
	 * A site behind a proxy that doesn't pass the visitor's address through
	 * sees every shopper as one address; such sites can raise the limit with
	 * the clothsy_ai_mint_limit filter.
	 */
	private static function within_mint_limit(): bool {
		$address = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		if ( '' === $address ) {
			return true;
		}
		$key    = 'clothsy_ai_mint_' . substr( hash_hmac( 'sha256', $address, wp_salt( 'nonce' ) ), 0, 32 );
		$bucket = get_transient( $key );
		$now    = time();

		if ( ! is_array( $bucket ) || ! isset( $bucket['n'], $bucket['until'] ) || $bucket['until'] <= $now ) {
			$bucket = array(
				'n'     => 0,
				'until' => $now + self::MINT_WINDOW,
			);
		}
		$limit = (int) apply_filters( 'clothsy_ai_mint_limit', self::MINT_LIMIT );
		if ( $limit > 0 && $bucket['n'] >= $limit ) {
			return false;
		}
		++$bucket['n'];
		set_transient( $key, $bucket, max( 1, $bucket['until'] - $now ) );
		return true;
	}

	/**
	 * GET /clothsy-ai/v1/verify — proves this site holds the store's secret.
	 *
	 * The proof is an HMAC of a message only this purpose uses, so answering it
	 * can't be turned into a signature for anything else.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function rest_verify( WP_REST_Request $request ) {
		$connection = Clothsy_AI_Settings::connection();
		$store      = (string) $request['store'];
		$challenge  = (string) $request['challenge'];

		if ( ! $connection || ! hash_equals( $connection['store_id'], $store ) || ! preg_match( '/^[A-Za-z0-9_-]{16,128}$/', $challenge ) ) {
			return new WP_Error( 'clothsy_ai_unknown_store', 'Unknown store', array( 'status' => 404 ) );
		}

		$response = rest_ensure_response(
			array( 'proof' => hash_hmac( 'sha256', 'clothsy-verify:' . $store . ':' . $challenge, $connection['secret'] ) )
		);
		$response->header( 'Cache-Control', 'no-store' );
		return $response;
	}
}
