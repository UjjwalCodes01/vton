<?php
/**
 * Per-product settings: a "Clothsy AI" tab in the product editor.
 *
 * @package ClothsyAI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Lets a merchant turn try-on off for a product and choose its garment type.
 * Stored as product meta through WooCommerce's CRUD API.
 */
class Clothsy_AI_Product_Meta {

	const META_DISABLED = '_clothsy_ai_disabled';
	const META_GARMENT  = '_clothsy_ai_garment';

	public static function init(): void {
		add_filter( 'woocommerce_product_data_tabs', array( __CLASS__, 'add_tab' ) );
		add_action( 'woocommerce_product_data_panels', array( __CLASS__, 'render_panel' ) );
		add_action( 'woocommerce_admin_process_product_object', array( __CLASS__, 'save' ) );
	}

	/** Garment types a merchant can pick, keyed by the value sent to Clothsy AI. */
	public static function garment_labels(): array {
		return array(
			'auto'       => __( 'Detect from product name', 'clothsy-ai' ),
			'upper_body' => __( 'Top (shirt, t-shirt, sweater)', 'clothsy-ai' ),
			'lower_body' => __( 'Bottom (trousers, jeans, skirt)', 'clothsy-ai' ),
			'full_body'  => __( 'Full body (dress, jumpsuit)', 'clothsy-ai' ),
			'outerwear'  => __( 'Outerwear (jacket, coat)', 'clothsy-ai' ),
			'shoes'      => __( 'Shoes', 'clothsy-ai' ),
		);
	}

	/**
	 * Whether shoppers may try this product on.
	 *
	 * @param WC_Product $product Product.
	 */
	public static function is_enabled_for( WC_Product $product ): bool {
		// Grouped products have no single garment to try on.
		return ! $product->is_type( 'grouped' ) && 'yes' !== $product->get_meta( self::META_DISABLED );
	}

	/**
	 * The merchant's garment type, or null to let Clothsy AI infer it.
	 *
	 * @param WC_Product $product Product.
	 */
	public static function garment_type( WC_Product $product ): ?string {
		$value = (string) $product->get_meta( self::META_GARMENT );
		return in_array( $value, Clothsy_AI_Settings::GARMENT_TYPES, true ) ? $value : null;
	}

	/**
	 * Absolute URL of a product image, at a size that is detailed enough for a
	 * try-on without sending a multi-megabyte original.
	 *
	 * @param int $image_id Attachment id.
	 */
	public static function image_url( int $image_id ): ?string {
		if ( ! $image_id ) {
			return null;
		}
		$url = wp_get_attachment_image_url( $image_id, 'large' ) ?: wp_get_attachment_image_url( $image_id, 'full' );
		if ( ! $url ) {
			return null;
		}
		// Some setups return protocol-relative or relative URLs.
		if ( str_starts_with( $url, '//' ) ) {
			$url = ( is_ssl() ? 'https:' : 'http:' ) . $url;
		} elseif ( str_starts_with( $url, '/' ) ) {
			$url = home_url( $url );
		}
		return esc_url_raw( $url );
	}

	/**
	 * @param array<string, array<string, mixed>> $tabs Product data tabs.
	 * @return array<string, array<string, mixed>>
	 */
	public static function add_tab( array $tabs ): array {
		$tabs['clothsy_ai'] = array(
			'label'    => __( 'Clothsy AI', 'clothsy-ai' ),
			'target'   => 'clothsy_ai_product_data',
			'class'    => array( 'hide_if_grouped' ),
			'priority' => 80,
		);
		return $tabs;
	}

	public static function render_panel(): void {
		global $product_object;
		$product = $product_object instanceof WC_Product ? $product_object : null;
		?>
		<div id="clothsy_ai_product_data" class="panel woocommerce_options_panel hidden">
			<div class="options_group">
				<?php
				woocommerce_wp_checkbox(
					array(
						'id'          => 'clothsy_ai_disabled',
						'label'       => __( 'Turn off try-on', 'clothsy-ai' ),
						'description' => __( 'Hide the try-on button for this product.', 'clothsy-ai' ),
						'value'       => $product && 'yes' === $product->get_meta( self::META_DISABLED ) ? 'yes' : 'no',
					)
				);
				woocommerce_wp_select(
					array(
						'id'          => 'clothsy_ai_garment',
						'label'       => __( 'Garment type', 'clothsy-ai' ),
						'options'     => self::garment_labels(),
						'value'       => $product ? ( self::garment_type( $product ) ?? 'auto' ) : 'auto',
						'desc_tip'    => true,
						'description' => __( 'Tells the try-on which part of the body this item goes on. Leave on "Detect" unless results look wrong.', 'clothsy-ai' ),
					)
				);
				?>
			</div>
		</div>
		<?php
	}

	/**
	 * WooCommerce has already checked its own nonce and the user's permission
	 * to edit the product before this hook runs.
	 *
	 * @param WC_Product $product Product being saved.
	 */
	public static function save( WC_Product $product ): void {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- verified by WooCommerce before woocommerce_admin_process_product_object.
		$product->update_meta_data( self::META_DISABLED, isset( $_POST['clothsy_ai_disabled'] ) ? 'yes' : 'no' );
		$garment = isset( $_POST['clothsy_ai_garment'] ) ? sanitize_key( wp_unslash( $_POST['clothsy_ai_garment'] ) ) : 'auto';
		// phpcs:enable
		$product->update_meta_data( self::META_GARMENT, in_array( $garment, Clothsy_AI_Settings::GARMENT_TYPES, true ) ? $garment : 'auto' );
	}
}
