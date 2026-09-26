<?php
/**
 * Runs when the plugin is deleted from the Plugins screen.
 *
 * Tells Clothsy AI to destroy this store's secret (best effort — deletion
 * still completes if the service can't be reached), then removes everything
 * the plugin stored in this site. Clothsy AI keeps the store's leads for 30
 * days in case the plugin is reinstalled, then deletes them.
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

/**
 * Disconnects (when this is the connected site) and removes the plugin's data
 * from the current site.
 */
function clothsy_ai_uninstall_site(): void {
	// Deleting the plugin from a staging copy must not disconnect the live store
	// whose credentials the copy carries, so only the connected site itself tells
	// Clothsy AI (which also refuses a disconnect from any other URL).
	$connection = Clothsy_AI_Settings::connection();
	if ( $connection && untrailingslashit( $connection['site_url'] ) === untrailingslashit( home_url() ) ) {
		Clothsy_AI_Api_Client::post_signed( '/api/woo/disconnect', array( 'siteUrl' => home_url() ) );
	}

	delete_option( Clothsy_AI_Settings::CONNECTION_OPTION );
	delete_option( Clothsy_AI_Settings::SETTINGS_OPTION );
	delete_transient( 'clothsy_ai_status' );
	delete_post_meta_by_key( '_clothsy_ai_disabled' );
	delete_post_meta_by_key( '_clothsy_ai_garment' );
}

// On a network, each site keeps its own connection, settings and product
// meta, and the plugin may have been active on any of them (per site or
// network-wide, which WordPress has already undone by now), so every site is
// cleaned up.
if ( is_multisite() ) {
	foreach ( get_sites( array( 'fields' => 'ids', 'number' => 0 ) ) as $clothsy_ai_site_id ) {
		switch_to_blog( (int) $clothsy_ai_site_id );
		clothsy_ai_uninstall_site();
		restore_current_blog();
	}
} else {
	clothsy_ai_uninstall_site();
}
