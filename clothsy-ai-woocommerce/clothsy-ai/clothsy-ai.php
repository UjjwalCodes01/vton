<?php
/**
 * Plugin Name:          Clothsy AI – Virtual Try-On for WooCommerce
 * Description:          Let shoppers see your clothes on themselves before they buy. Adds an AI virtual try-on button to WooCommerce product pages.
 * Version:              0.2.2
 * Requires at least:    6.5
 * Requires PHP:         8.1
 * Requires Plugins:     woocommerce
 * Author:               Clothsy AI
 * License:              GPL-2.0-or-later
 * License URI:          https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:          clothsy-ai
 * Domain Path:          /languages
 * WC requires at least: 8.5
 * WC tested up to:      11.1
 *
 * @package ClothsyAI
 */

defined( 'ABSPATH' ) || exit;

define( 'CLOTHSY_AI_VERSION', '0.2.2' );
define( 'CLOTHSY_AI_FILE', __FILE__ );
define( 'CLOTHSY_AI_DIR', plugin_dir_path( __FILE__ ) );
define( 'CLOTHSY_AI_URL', plugin_dir_url( __FILE__ ) );

// The Clothsy AI service. Overridable from wp-config.php (local development,
// or a future custom domain) without editing the plugin.
if ( ! defined( 'CLOTHSY_AI_API_BASE' ) ) {
	define( 'CLOTHSY_AI_API_BASE', 'https://fabricvton-api.onrender.com' );
}

require_once CLOTHSY_AI_DIR . 'includes/class-clothsy-ai-settings.php';
require_once CLOTHSY_AI_DIR . 'includes/class-clothsy-ai-api-client.php';
require_once CLOTHSY_AI_DIR . 'includes/class-clothsy-ai-connection.php';
require_once CLOTHSY_AI_DIR . 'includes/class-clothsy-ai-rest.php';
require_once CLOTHSY_AI_DIR . 'includes/class-clothsy-ai-frontend.php';
require_once CLOTHSY_AI_DIR . 'includes/class-clothsy-ai-product-meta.php';
require_once CLOTHSY_AI_DIR . 'includes/class-clothsy-ai-admin.php';
require_once CLOTHSY_AI_DIR . 'includes/class-clothsy-ai-privacy.php';

/*
 * This plugin never reads or writes orders, and adds nothing to cart or
 * checkout. Declaring that keeps WooCommerce from flagging it as incompatible
 * with High-Performance Order Storage or the block-based cart and checkout.
 */
add_action(
	'before_woocommerce_init',
	static function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', CLOTHSY_AI_FILE, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', CLOTHSY_AI_FILE, true );
		}
	}
);

add_action(
	'plugins_loaded',
	static function () {
		// "Requires Plugins" stops activation without WooCommerce, but WooCommerce
		// can still be deactivated later; stay inert rather than fatal.
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}
		Clothsy_AI_Rest::init();
		Clothsy_AI_Frontend::init();
		Clothsy_AI_Product_Meta::init();
		Clothsy_AI_Admin::init();
		Clothsy_AI_Privacy::init();
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	static function ( array $links ): array {
		$settings = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'admin.php?page=clothsy-ai' ) ),
			esc_html__( 'Settings', 'clothsy-ai' )
		);
		array_unshift( $links, $settings );
		return $links;
	}
);
