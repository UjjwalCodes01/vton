<?php
/**
 * Server-to-server calls from this WordPress site to the Clothsy AI service.
 *
 * @package ClothsyAI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Signs and sends requests to Clothsy AI.
 *
 * Every call after registration is signed with the store's secret over the
 * method, path, time, a one-time nonce and a hash of the body, so it can't be
 * forged, altered in transit or replayed. The secret itself is never sent.
 */
class Clothsy_AI_Api_Client {

	/**
	 * The exact string that is signed. Must match canonicalRequest() in the
	 * Clothsy AI backend (app/woo/auth.server.ts) byte for byte.
	 *
	 * @param string $method    HTTP method.
	 * @param string $path      URL path, e.g. /api/woo/status.
	 * @param string $timestamp Unix seconds.
	 * @param string $nonce     One-time random value.
	 * @param string $body      Raw request body.
	 */
	public static function canonical( string $method, string $path, string $timestamp, string $nonce, string $body ): string {
		return strtoupper( $method ) . "\n" . $path . "\n" . $timestamp . "\n" . $nonce . "\n" . hash( 'sha256', $body );
	}

	/** URL-safe base64 without padding. */
	public static function base64url( string $data ): string {
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}

	/**
	 * Unsigned POST; used only to register a new store.
	 *
	 * @param string               $path Path on the Clothsy AI service.
	 * @param array<string, mixed> $data JSON body.
	 * @return array<string, mixed>|WP_Error
	 */
	public static function post_public( string $path, array $data ) {
		return self::send( $path, wp_json_encode( $data ), array() );
	}

	/**
	 * Signed POST on behalf of the connected store.
	 *
	 * @param string               $path Path on the Clothsy AI service.
	 * @param array<string, mixed> $data JSON body.
	 * @param bool                 $raw  Return the raw body (e.g. CSV) instead of decoded JSON.
	 * @return array<string, mixed>|string|WP_Error
	 */
	public static function post_signed( string $path, array $data = array(), bool $raw = false ) {
		$connection = Clothsy_AI_Settings::connection();
		if ( ! $connection ) {
			return new WP_Error( 'clothsy_ai_not_connected', __( 'This store is not connected to Clothsy AI.', 'clothsy-ai' ) );
		}

		$body      = $data ? wp_json_encode( $data ) : '{}';
		$timestamp = (string) time();
		$nonce     = self::base64url( random_bytes( 18 ) );
		$signature = hash_hmac( 'sha256', self::canonical( 'POST', $path, $timestamp, $nonce, $body ), $connection['secret'] );

		return self::send(
			$path,
			$body,
			array(
				'X-Clothsy-Store'     => $connection['store_id'],
				'X-Clothsy-Timestamp' => $timestamp,
				'X-Clothsy-Nonce'     => $nonce,
				'X-Clothsy-Signature' => $signature,
			),
			$raw
		);
	}

	/**
	 * Sends a request and turns failures into WP_Error with a merchant-readable message.
	 *
	 * @param string                $path    Path on the Clothsy AI service.
	 * @param string                $body    JSON body.
	 * @param array<string, string> $headers Extra headers.
	 * @param bool                  $raw     Return the raw body instead of decoded JSON.
	 * @return array<string, mixed>|string|WP_Error
	 */
	private static function send( string $path, string $body, array $headers, bool $raw = false ) {
		$response = wp_remote_post(
			untrailingslashit( CLOTHSY_AI_API_BASE ) . $path,
			array(
				// Verification calls this site back, which can take a few seconds on slow hosts.
				'timeout' => 30,
				'headers' => array_merge(
					array(
						'Content-Type' => 'application/json',
						'Accept'       => $raw ? 'text/csv' : 'application/json',
						'User-Agent'   => 'ClothsyAI-WooCommerce/' . CLOTHSY_AI_VERSION . '; ' . home_url(),
					),
					$headers
				),
				'body'    => $body,
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'clothsy_ai_unreachable',
				__( 'Could not reach Clothsy AI. Please check your connection and try again.', 'clothsy-ai' ),
				$response->get_error_message()
			);
		}

		$code     = (int) wp_remote_retrieve_response_code( $response );
		$contents = (string) wp_remote_retrieve_body( $response );

		if ( $raw && $code >= 200 && $code < 300 ) {
			return $contents;
		}

		$decoded = json_decode( $contents, true );
		if ( $code < 200 || $code >= 300 ) {
			$message = is_array( $decoded ) && ! empty( $decoded['error'] )
				? (string) $decoded['error']
				/* translators: %d: HTTP status code. */
				: sprintf( __( 'Clothsy AI returned an error (%d).', 'clothsy-ai' ), $code );
			return new WP_Error(
				is_array( $decoded ) && ! empty( $decoded['code'] ) ? 'clothsy_ai_' . sanitize_key( $decoded['code'] ) : 'clothsy_ai_http_' . $code,
				$message,
				array( 'status' => $code )
			);
		}

		return is_array( $decoded ) ? $decoded : array();
	}
}
