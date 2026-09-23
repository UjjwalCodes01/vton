<?php
/**
 * The try-on button on product pages: automatic placement, shortcode and block.
 *
 * @package ClothsyAI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Renders the button and loads the widget only where a button is shown.
 */
class Clothsy_AI_Frontend {

	/** Products that already got a button on this page, so fallbacks don't duplicate it. */
	private static array $rendered = array();

	public static function init(): void {
		add_action( 'init', array( __CLASS__, 'register_assets' ) );
		add_action( 'init', array( __CLASS__, 'register_block' ) );
		add_shortcode( 'clothsy_ai_tryon', array( __CLASS__, 'shortcode' ) );

		// Classic themes: right after the Add to cart button. That hook runs
		// inside the add-to-cart form, which is why the button is type="button".
		add_action( 'woocommerce_after_add_to_cart_button', array( __CLASS__, 'auto_place' ), 20 );
		// Out-of-stock products render no add-to-cart form, so the hook above
		// never fires for them; this later summary slot catches that case.
		add_action( 'woocommerce_single_product_summary', array( __CLASS__, 'auto_place' ), 39 );
	}

	public static function register_assets(): void {
		wp_register_script(
			'clothsy-ai',
			CLOTHSY_AI_URL . 'assets/clothsy-ai.js',
			array(),
			CLOTHSY_AI_VERSION,
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);
	}

	public static function register_block(): void {
		register_block_type( CLOTHSY_AI_DIR . 'blocks/try-on-button' );
	}

	/** Automatic placement on single product pages (classic themes). */
	public static function auto_place(): void {
		if ( 'auto' !== Clothsy_AI_Settings::get()['placement'] ) {
			return;
		}
		echo self::render_button(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in render_button().
	}

	/**
	 * [clothsy_ai_tryon] or [clothsy_ai_tryon product_id="123"]
	 *
	 * @param array<string, string>|string $atts Shortcode attributes.
	 */
	public static function shortcode( $atts ): string {
		$atts = shortcode_atts( array( 'product_id' => 0 ), is_array( $atts ) ? $atts : array(), 'clothsy_ai_tryon' );
		return self::render_button( absint( $atts['product_id'] ) );
	}

	/**
	 * Button HTML for a product, or an empty string when try-on isn't available
	 * for it (not connected, turned off for the product, or nothing to try on).
	 *
	 * @param int $product_id Product id; 0 means the current product.
	 */
	public static function render_button( int $product_id = 0 ): string {
		if ( ! Clothsy_AI_Connection::is_ready() ) {
			return '';
		}

		$product = $product_id ? wc_get_product( $product_id ) : self::current_product();
		if ( ! $product instanceof WC_Product || ! Clothsy_AI_Product_Meta::is_enabled_for( $product ) ) {
			return '';
		}
		// Variable products may carry images only on their variations.
		if ( ! $product->get_image_id() && ! $product->is_type( 'variable' ) ) {
			return '';
		}
		if ( isset( self::$rendered[ $product->get_id() ] ) ) {
			return '';
		}
		self::$rendered[ $product->get_id() ] = true;

		wp_enqueue_script( 'clothsy-ai' );
		$settings = Clothsy_AI_Settings::get();

		$style = sprintf(
			'background-color:%1$s;color:%2$s;border:none;border-radius:%3$dpx;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%%;max-width:400px;display:flex;align-items:center;justify-content:center;gap:8px;line-height:1.2;',
			$settings['button_color'],
			$settings['text_color'],
			(int) $settings['radius']
		);

		ob_start();
		?>
		<div class="clothsy-ai-widget" style="margin:12px 0;clear:both;">
			<button
				type="button"
				class="clothsy-ai-button"
				data-clothsy-ai-button
				data-product-id="<?php echo esc_attr( (string) $product->get_id() ); ?>"
				data-product-title="<?php echo esc_attr( wp_strip_all_tags( $product->get_name() ) ); ?>"
				<?php /* Shown as the garment thumbnail in the try-on panel. */ ?>
				data-product-image="<?php echo esc_url( (string) wp_get_attachment_image_url( $product->get_image_id(), 'woocommerce_single' ) ); ?>"
				data-session-url="<?php echo esc_url( rest_url( 'clothsy-ai/v1/session' ) ); ?>"
				data-ajax-url="<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>"
				<?php /* WooCommerce's own add-to-cart endpoint, so the try-on window adds items exactly as the theme's button does. */ ?>
				data-cart-add-url="<?php echo esc_url( WC_AJAX::get_endpoint( 'add_to_cart' ) ); ?>"
				data-cart-url="<?php echo esc_url( wc_get_cart_url() ); ?>"
				data-css-url="<?php echo esc_url( CLOTHSY_AI_URL . 'assets/clothsy-ai.css?ver=' . CLOTHSY_AI_VERSION ); ?>"
				data-logo-url="<?php echo esc_url( CLOTHSY_AI_URL . 'assets/logo.png' ); ?>"
				<?php /* So a shared look can link back to the product it was tried on. */ ?>
				data-product-url="<?php echo esc_url( (string) $product->get_permalink() ); ?>"
				style="<?php echo esc_attr( $style ); ?>"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>
				<?php echo esc_html( $settings['button_text'] ); ?>
			</button>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	/** The product being viewed, in both classic templates and block themes. */
	private static function current_product(): ?WC_Product {
		global $product;
		if ( $product instanceof WC_Product ) {
			return $product;
		}
		$candidate = wc_get_product( get_the_ID() );
		return $candidate instanceof WC_Product ? $candidate : null;
	}
}
