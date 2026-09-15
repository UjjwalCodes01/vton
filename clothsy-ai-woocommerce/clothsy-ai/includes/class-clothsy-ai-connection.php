<?php
/**
 * Connecting, confirming and disconnecting this store.
 *
 * @package ClothsyAI
 */

defined( 'ABSPATH' ) || exit;

/**
 * The connection lifecycle.
 *
 * Connecting is two steps: register (Clothsy AI issues a store id and secret),
 * then verify (Clothsy AI calls this site's verify endpoint with a challenge,
 * which only a site holding the secret can answer). Verifying proves the store
 * owns the URL it registered with, and is reused when a site moves to a new URL.
 */
class Clothsy_AI_Connection {

	/**
	 * Registers this store and confirms the connection.
	 *
	 * @return true|WP_Error
	 */
	public static function connect() {
		$registered = Clothsy_AI_Api_Client::post_public(
			'/api/woo/register',
			array(
				'siteUrl'       => home_url(),
				'adminEmail'    => get_option( 'admin_email' ),
				'storeName'     => get_bloginfo( 'name' ),
				'pluginVersion' => CLOTHSY_AI_VERSION,
			)
		);
		if ( is_wp_error( $registered ) ) {
			return $registered;
		}
		if ( empty( $registered['storeId'] ) || empty( $registered['secret'] ) ) {
			return new WP_Error( 'clothsy_ai_bad_response', __( 'Clothsy AI returned an unexpected response. Please try again.', 'clothsy-ai' ) );
		}

		Clothsy_AI_Settings::save_connection( (string) $registered['storeId'], (string) $registered['secret'], 'pending' );
		return self::verify();
	}

	/**
	 * Asks Clothsy AI to confirm this site's URL. Also used after a site moves.
	 *
	 * @return true|WP_Error
	 */
	public static function verify() {
		$result = Clothsy_AI_Api_Client::post_signed(
			'/api/woo/verify',
			array(
				'siteUrl'   => home_url(),
				'verifyUrl' => rest_url( 'clothsy-ai/v1/verify' ),
			)
		);
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		Clothsy_AI_Settings::set_connection_status( 'connected' );
		delete_transient( 'clothsy_ai_status' );
		return true;
	}

	/**
	 * Disconnects: Clothsy AI destroys the secret, then it is forgotten here.
	 * Local credentials are cleared even if Clothsy AI can't be reached.
	 */
	public static function disconnect(): void {
		Clothsy_AI_Api_Client::post_signed( '/api/woo/disconnect' );
		Clothsy_AI_Settings::clear_connection();
	}

	/**
	 * Store status from Clothsy AI (plan, usage, stats), cached for a minute so
	 * the admin screen doesn't call out on every load.
	 *
	 * @param bool $fresh Skip the cache.
	 * @return array<string, mixed>|WP_Error
	 */
	public static function status( bool $fresh = false ) {
		if ( ! $fresh ) {
			$cached = get_transient( 'clothsy_ai_status' );
			if ( is_array( $cached ) ) {
				return $cached;
			}
		}
		$status = Clothsy_AI_Api_Client::post_signed(
			'/api/woo/status',
			array(
				'siteUrl'       => home_url(),
				'pluginVersion' => CLOTHSY_AI_VERSION,
			)
		);
		if ( ! is_wp_error( $status ) ) {
			set_transient( 'clothsy_ai_status', $status, MINUTE_IN_SECONDS );
		}
		return $status;
	}

	/**
	 * Whether shoppers can use try-on: connected and confirmed for this exact URL.
	 * A staging copy carries the same credentials but a different URL, so it
	 * stays off until the merchant explicitly moves the connection.
	 */
	public static function is_ready(): bool {
		$connection = Clothsy_AI_Settings::connection();
		return $connection
			&& 'connected' === $connection['status']
			&& untrailingslashit( $connection['site_url'] ) === untrailingslashit( home_url() );
	}
}
