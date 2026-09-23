<?php
/**
 * Plugin options: the connection (credentials) and the button's appearance.
 *
 * @package ClothsyAI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes the plugin's two options.
 *
 * The connection option holds this store's signing secret. It is never
 * autoloaded (so it isn't pulled into memory on every page view), never sent
 * to the browser, and is encrypted with this site's own WordPress salts, so a
 * database dump alone doesn't reveal it.
 */
class Clothsy_AI_Settings {

	const CONNECTION_OPTION = 'clothsy_ai_connection';
	const SETTINGS_OPTION   = 'clothsy_ai_settings';

	const GARMENT_TYPES = array( 'upper_body', 'lower_body', 'full_body', 'outerwear', 'shoes' );

	/**
	 * Defaults for the button's appearance.
	 *
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'button_text'   => __( 'Try It On', 'clothsy-ai' ),
			'button_color'  => '#000000',
			'text_color'    => '#ffffff',
			'radius'        => 4,
			'placement'     => 'auto',
		);
	}

	/**
	 * Button settings, merged over the defaults.
	 *
	 * @return array<string, mixed>
	 */
	public static function get(): array {
		$saved = get_option( self::SETTINGS_OPTION, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults() );
	}

	/**
	 * Validates and saves button settings from the admin form.
	 *
	 * @param array<string, mixed> $input Raw form input (already unslashed).
	 */
	public static function save( array $input ): void {
		$defaults = self::defaults();
		$clean    = array(
			'button_text'   => sanitize_text_field( $input['button_text'] ?? '' ),
			'button_color'  => sanitize_hex_color( $input['button_color'] ?? '' ) ?: $defaults['button_color'],
			'text_color'    => sanitize_hex_color( $input['text_color'] ?? '' ) ?: $defaults['text_color'],
			'radius'        => max( 0, min( 50, absint( $input['radius'] ?? $defaults['radius'] ) ) ),
			'placement'     => in_array( $input['placement'] ?? '', array( 'auto', 'manual' ), true ) ? $input['placement'] : 'auto',
		);
		if ( '' === $clean['button_text'] ) {
			$clean['button_text'] = $defaults['button_text'];
		}
		update_option( self::SETTINGS_OPTION, $clean );
	}

	/**
	 * The stored connection, with the secret decrypted.
	 *
	 * @return array{store_id: string, secret: string, site_url: string, status: string}|null
	 *         Null when not connected, or when the secret can't be decrypted
	 *         (for example after the site's salts were changed).
	 */
	public static function connection(): ?array {
		$stored = get_option( self::CONNECTION_OPTION );
		if ( ! is_array( $stored ) || empty( $stored['store_id'] ) || empty( $stored['secret'] ) ) {
			return null;
		}
		$secret = self::decrypt( (string) $stored['secret'] );
		if ( null === $secret ) {
			return null;
		}
		return array(
			'store_id' => (string) $stored['store_id'],
			'secret'   => $secret,
			'site_url' => (string) ( $stored['site_url'] ?? '' ),
			'status'   => (string) ( $stored['status'] ?? 'pending' ),
		);
	}

	/**
	 * Whether credentials exist but can no longer be decrypted, which means the
	 * site's security salts changed and the merchant must reconnect.
	 */
	public static function connection_unreadable(): bool {
		$stored = get_option( self::CONNECTION_OPTION );
		return is_array( $stored ) && ! empty( $stored['secret'] ) && null === self::decrypt( (string) $stored['secret'] );
	}

	/**
	 * Saves the connection. The secret is encrypted before it is stored.
	 *
	 * @param string $store_id Store id issued by Clothsy AI.
	 * @param string $secret   Signing secret issued by Clothsy AI.
	 * @param string $status   pending | connected.
	 */
	public static function save_connection( string $store_id, string $secret, string $status ): void {
		update_option(
			self::CONNECTION_OPTION,
			array(
				'store_id' => $store_id,
				'secret'   => self::encrypt( $secret ),
				'site_url' => home_url(),
				'status'   => $status,
			),
			false
		);
	}

	/**
	 * Updates just the connection status (and the URL it was confirmed for).
	 *
	 * @param string $status pending | connected.
	 */
	public static function set_connection_status( string $status ): void {
		$stored = get_option( self::CONNECTION_OPTION );
		if ( is_array( $stored ) ) {
			$stored['status']   = $status;
			$stored['site_url'] = home_url();
			update_option( self::CONNECTION_OPTION, $stored, false );
		}
	}

	/** Forgets the connection entirely. */
	public static function clear_connection(): void {
		delete_option( self::CONNECTION_OPTION );
		delete_transient( 'clothsy_ai_status' );
	}

	/** Key derived from this site's salts, so the secret is unreadable elsewhere. */
	private static function key(): string {
		return hash( 'sha256', wp_salt( 'auth' ) . '|clothsy-ai', true );
	}

	private static function encrypt( string $plain ): string {
		if ( ! function_exists( 'openssl_encrypt' ) ) {
			// No OpenSSL is rare; store encoded rather than refuse to work.
			return 'p1:' . base64_encode( $plain ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		}
		$iv     = random_bytes( 12 );
		$tag    = '';
		$cipher = openssl_encrypt( $plain, 'aes-256-gcm', self::key(), OPENSSL_RAW_DATA, $iv, $tag );
		return 'v1:' . base64_encode( $iv . $tag . $cipher ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}

	private static function decrypt( string $stored ): ?string {
		if ( str_starts_with( $stored, 'p1:' ) ) {
			$plain = base64_decode( substr( $stored, 3 ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
			return false === $plain ? null : $plain;
		}
		if ( ! str_starts_with( $stored, 'v1:' ) || ! function_exists( 'openssl_decrypt' ) ) {
			return null;
		}
		$data = base64_decode( substr( $stored, 3 ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		if ( false === $data || strlen( $data ) < 29 ) {
			return null;
		}
		$plain = openssl_decrypt( substr( $data, 28 ), 'aes-256-gcm', self::key(), OPENSSL_RAW_DATA, substr( $data, 0, 12 ), substr( $data, 12, 16 ) );
		return false === $plain ? null : $plain;
	}
}
