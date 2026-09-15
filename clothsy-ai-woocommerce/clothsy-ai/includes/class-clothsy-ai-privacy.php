<?php
/**
 * WordPress privacy tools: personal data export and erasure, and suggested
 * privacy policy text.
 *
 * @package ClothsyAI
 */

defined( 'ABSPATH' ) || exit;

/**
 * The shopper data this plugin creates (lead emails and try-on history) is
 * held by Clothsy AI, not in this site's database, so WordPress's Export and
 * Erase Personal Data tools fetch and erase it there. WordPress confirms each
 * request with the shopper by email before these run.
 */
class Clothsy_AI_Privacy {

	public static function init(): void {
		add_filter( 'wp_privacy_personal_data_exporters', array( __CLASS__, 'register_exporter' ) );
		add_filter( 'wp_privacy_personal_data_erasers', array( __CLASS__, 'register_eraser' ) );
		add_action( 'admin_init', array( __CLASS__, 'policy_content' ) );
	}

	/**
	 * @param array<string, array<string, mixed>> $exporters Registered exporters.
	 * @return array<string, array<string, mixed>>
	 */
	public static function register_exporter( array $exporters ): array {
		$exporters['clothsy-ai'] = array(
			'exporter_friendly_name' => __( 'Clothsy AI virtual try-on', 'clothsy-ai' ),
			'callback'               => array( __CLASS__, 'export' ),
		);
		return $exporters;
	}

	/**
	 * @param array<string, array<string, mixed>> $erasers Registered erasers.
	 * @return array<string, array<string, mixed>>
	 */
	public static function register_eraser( array $erasers ): array {
		$erasers['clothsy-ai'] = array(
			'eraser_friendly_name' => __( 'Clothsy AI virtual try-on', 'clothsy-ai' ),
			'callback'             => array( __CLASS__, 'erase' ),
		);
		return $erasers;
	}

	/**
	 * Everything Clothsy AI holds for one shopper, in WordPress's export format.
	 *
	 * @param string $email Shopper's email address.
	 * @param int    $page  Page number; everything fits on the first.
	 * @return array{data: array<int, array<string, mixed>>, done: bool}|WP_Error
	 */
	public static function export( string $email, int $page = 1 ) {
		unset( $page );
		if ( ! Clothsy_AI_Connection::is_this_site() ) {
			return array( 'data' => array(), 'done' => true );
		}

		$remote = Clothsy_AI_Api_Client::post_signed( '/api/woo/privacy/export', array( 'email' => $email ) );
		if ( is_wp_error( $remote ) ) {
			return $remote;
		}

		$items = array();

		foreach ( (array) ( $remote['leads'] ?? array() ) as $i => $lead ) {
			$items[] = array(
				'group_id'          => 'clothsy-ai-leads',
				'group_label'       => __( 'Virtual try-on: email sign-ups', 'clothsy-ai' ),
				'group_description' => __( 'Email addresses entered in the virtual try-on window.', 'clothsy-ai' ),
				'item_id'           => 'clothsy-ai-lead-' . $i,
				'data'              => array(
					array( 'name' => __( 'Email', 'clothsy-ai' ), 'value' => (string) ( $lead['email'] ?? '' ) ),
					array( 'name' => __( 'Product', 'clothsy-ai' ), 'value' => (string) ( $lead['productTitle'] ?? '' ) ),
					array( 'name' => __( 'Date', 'clothsy-ai' ), 'value' => (string) ( $lead['capturedAt'] ?? '' ) ),
				),
			);
		}

		foreach ( (array) ( $remote['tryOns'] ?? array() ) as $i => $try_on ) {
			$items[] = array(
				'group_id'          => 'clothsy-ai-try-ons',
				'group_label'       => __( 'Virtual try-on: history', 'clothsy-ai' ),
				'group_description' => __( 'Products tried on in the virtual try-on window. Uploaded photos and generated images are never stored.', 'clothsy-ai' ),
				'item_id'           => 'clothsy-ai-try-on-' . $i,
				'data'              => array(
					array( 'name' => __( 'Product', 'clothsy-ai' ), 'value' => (string) ( $try_on['productTitle'] ?? '' ) ),
					array( 'name' => __( 'Result', 'clothsy-ai' ), 'value' => (string) ( $try_on['status'] ?? '' ) ),
					array( 'name' => __( 'Date', 'clothsy-ai' ), 'value' => (string) ( $try_on['occurredAt'] ?? '' ) ),
				),
			);
		}

		if ( $items ) {
			$about = array();
			foreach ( (array) ( $remote['retentionPolicy'] ?? array() ) as $what => $how_long ) {
				$about[] = array( 'name' => (string) $what, 'value' => (string) $how_long );
			}
			$items[] = array(
				'group_id'    => 'clothsy-ai-about',
				'group_label' => __( 'Virtual try-on: how this data is kept', 'clothsy-ai' ),
				'item_id'     => 'clothsy-ai-about',
				'data'        => $about,
			);
		}

		return array( 'data' => $items, 'done' => true );
	}

	/**
	 * Erases one shopper's data held by Clothsy AI.
	 *
	 * @param string $email Shopper's email address.
	 * @param int    $page  Page number; everything is erased on the first.
	 * @return array{items_removed: bool, items_retained: bool, messages: array<int, string>, done: bool}|WP_Error
	 */
	public static function erase( string $email, int $page = 1 ) {
		unset( $page );
		if ( ! Clothsy_AI_Connection::is_this_site() ) {
			return array(
				'items_removed'  => false,
				'items_retained' => false,
				'messages'       => array( __( "Clothsy AI isn't connected on this site, so nothing was erased there. Data Clothsy AI held for a disconnected store is deleted automatically 30 days after disconnecting.", 'clothsy-ai' ) ),
				'done'           => true,
			);
		}

		$result = Clothsy_AI_Api_Client::post_signed( '/api/woo/privacy/erase', array( 'email' => $email ) );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return array(
			'items_removed'  => ( (int) ( $result['leadsDeleted'] ?? 0 ) + (int) ( $result['tryOnsAnonymized'] ?? 0 ) ) > 0,
			'items_retained' => false,
			'messages'       => array(),
			'done'           => true,
		);
	}

	/** Suggested text for the store's privacy policy (Settings → Privacy → Policy Guide). */
	public static function policy_content(): void {
		if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
			return;
		}
		$content  = '<p class="privacy-policy-tutorial">' . esc_html__( 'Suggested text for stores using the Clothsy AI virtual try-on. Adjust it to match your settings.', 'clothsy-ai' ) . '</p>';
		$content .= '<strong class="privacy-policy-tutorial">' . esc_html__( 'Suggested text:', 'clothsy-ai' ) . ' </strong>';
		$content .= '<p>' . esc_html__( 'Our product pages offer a virtual try-on, provided by Clothsy AI. If you use it, the photo you upload and the product you are trying on are sent to Clothsy AI to create the try-on image. Your photo is processed only to create that image; it is not stored and is not used to train AI models.', 'clothsy-ai' ) . '</p>';
		$content .= '<p>' . esc_html__( 'If we ask for your email address before a try-on, it is stored by Clothsy AI on our behalf together with the products you tried on, and we may use it to contact you about those products. You can ask us to export or delete this data at any time.', 'clothsy-ai' ) . '</p>';
		$content .= '<p>' . sprintf(
			/* translators: %s: link to the Clothsy AI shopper privacy notice. */
			esc_html__( 'Learn more in the %s.', 'clothsy-ai' ),
			'<a href="https://www.fabricvton.com/widget-privacy">' . esc_html__( 'Clothsy AI shopper privacy notice', 'clothsy-ai' ) . '</a>'
		) . '</p>';

		wp_add_privacy_policy_content( 'Clothsy AI', wp_kses_post( $content ) );
	}
}
