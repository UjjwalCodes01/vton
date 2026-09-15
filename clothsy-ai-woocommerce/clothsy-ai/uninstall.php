<?php
/**
 * Runs when the plugin is deleted from the Plugins screen.
 *
 * Tells Clothsy AI to destroy this store's secret (best effort — deletion
 * still completes if the service can't be reached), then removes everything
 * the plugin stored in this site.
 *
 * @package ClothsyAI
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

if ( ! defined( 'CLOTHSY_AI_VERSION' ) ) {
	define( 'CLOTHSY_AI_VERSION', 'uninstall' );
}
if ( ! defined( 'CLOTHSY_AI_API_BASE' ) ) {
	define( 'CLOTHSY_AI_API_BASE', 'https://fabricvton-api.onrender.com' );
}

require_once __DIR__ . '/includes/class-clothsy-ai-settings.php';
require_once __DIR__ . '/includes/class-clothsy-ai-api-client.php';

if ( Clothsy_AI_Settings::connection() ) {
	Clothsy_AI_Api_Client::post_signed( '/api/woo/disconnect' );
}

delete_option( Clothsy_AI_Settings::CONNECTION_OPTION );
delete_option( Clothsy_AI_Settings::SETTINGS_OPTION );
delete_transient( 'clothsy_ai_status' );
delete_post_meta_by_key( '_clothsy_ai_disabled' );
delete_post_meta_by_key( '_clothsy_ai_garment' );
