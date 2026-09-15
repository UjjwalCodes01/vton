<?php
/**
 * The merchant's screen: WooCommerce → Clothsy AI.
 *
 * @package ClothsyAI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Admin page and its form handlers. Every handler checks the
 * manage_woocommerce capability and a nonce, then redirects back to the page
 * (post/redirect/get), carrying its result in a short-lived per-user notice.
 */
class Clothsy_AI_Admin {

	const PAGE       = 'clothsy-ai';
	const CAPABILITY = 'manage_woocommerce';

	public static function init(): void {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'admin_notices', array( __CLASS__, 'plugins_screen_notice' ) );

		foreach ( array( 'connect', 'reverify', 'disconnect', 'toggle', 'save_settings', 'leads_csv' ) as $action ) {
			add_action( 'admin_post_clothsy_ai_' . $action, array( __CLASS__, 'handle_' . $action ) );
		}
	}

	public static function menu(): void {
		add_submenu_page(
			'woocommerce',
			__( 'Clothsy AI', 'clothsy-ai' ),
			__( 'Clothsy AI', 'clothsy-ai' ),
			self::CAPABILITY,
			self::PAGE,
			array( __CLASS__, 'render' )
		);
	}

	/**
	 * @param string $hook Current admin page hook.
	 */
	public static function assets( string $hook ): void {
		if ( 'woocommerce_page_' . self::PAGE !== $hook ) {
			return;
		}
		wp_enqueue_style( 'wp-color-picker' );
		wp_enqueue_script( 'wp-color-picker' );
		wp_add_inline_script( 'wp-color-picker', 'jQuery(function($){$(".clothsy-ai-color").wpColorPicker();});' );
		wp_enqueue_style( 'clothsy-ai-admin', CLOTHSY_AI_URL . 'assets/admin.css', array(), CLOTHSY_AI_VERSION );
	}

	/** A one-line pointer on the Plugins screen until the store is connected. */
	public static function plugins_screen_notice(): void {
		$screen = get_current_screen();
		if ( ! $screen || 'plugins' !== $screen->id || ! current_user_can( self::CAPABILITY ) || Clothsy_AI_Settings::connection() ) {
			return;
		}
		printf(
			'<div class="notice notice-info is-dismissible"><p>%s <a href="%s">%s</a></p></div>',
			esc_html__( 'Clothsy AI is installed. Connect your store to show the virtual try-on button.', 'clothsy-ai' ),
			esc_url( self::page_url() ),
			esc_html__( 'Connect now', 'clothsy-ai' )
		);
	}

	// ─── Handlers ───────────────────────────────────────────────────────────

	public static function handle_connect(): void {
		self::guard( 'connect' );
		$result = Clothsy_AI_Connection::connect();
		self::finish( $result, __( 'Your store is connected. The try-on button now appears on your product pages.', 'clothsy-ai' ) );
	}

	/** Retries confirmation, or moves the connection to this site's current URL. */
	public static function handle_reverify(): void {
		self::guard( 'reverify' );
		$result = Clothsy_AI_Connection::verify();
		self::finish( $result, __( 'Connection confirmed for this site.', 'clothsy-ai' ) );
	}

	public static function handle_disconnect(): void {
		self::guard( 'disconnect' );
		Clothsy_AI_Connection::disconnect();
		self::finish( true, __( 'Disconnected. The try-on button is no longer shown.', 'clothsy-ai' ) );
	}

	public static function handle_toggle(): void {
		self::guard( 'toggle' );
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- checked in guard().
		$enable = isset( $_POST['enable'] ) && '1' === $_POST['enable'];
		$result = Clothsy_AI_Api_Client::post_signed( '/api/woo/settings', array( 'isEnabled' => $enable ) );
		delete_transient( 'clothsy_ai_status' );
		self::finish(
			is_wp_error( $result ) ? $result : true,
			$enable ? __( 'Virtual try-on turned on.', 'clothsy-ai' ) : __( 'Virtual try-on turned off.', 'clothsy-ai' )
		);
	}

	public static function handle_save_settings(): void {
		self::guard( 'save_settings' );
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- checked in guard(); each field is sanitized in save().
		$input = isset( $_POST['clothsy_ai'] ) && is_array( $_POST['clothsy_ai'] ) ? wp_unslash( $_POST['clothsy_ai'] ) : array();
		Clothsy_AI_Settings::save( $input );
		self::finish( true, __( 'Button settings saved.', 'clothsy-ai' ) );
	}

	/** Streams the leads CSV straight from Clothsy AI to the merchant's browser. */
	public static function handle_leads_csv(): void {
		self::guard( 'leads_csv' );
		$csv = Clothsy_AI_Api_Client::post_signed( '/api/woo/leads', array(), true );
		if ( is_wp_error( $csv ) ) {
			self::finish( $csv, '' );
		}
		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="clothsy-ai-leads-' . gmdate( 'Y-m-d' ) . '.csv"' );
		echo $csv; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- a CSV file download, already formula-neutralised by Clothsy AI.
		exit;
	}

	/**
	 * Capability and nonce check shared by every handler.
	 *
	 * @param string $action Handler name.
	 */
	private static function guard( string $action ): void {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			wp_die( esc_html__( 'You do not have permission to manage Clothsy AI.', 'clothsy-ai' ), 403 );
		}
		check_admin_referer( 'clothsy_ai_' . $action );
	}

	/**
	 * Stores the outcome as a notice and returns to the page.
	 *
	 * @param true|WP_Error $result  Outcome.
	 * @param string        $success Message on success.
	 * @return never
	 */
	private static function finish( $result, string $success ): void {
		set_transient(
			'clothsy_ai_notice_' . get_current_user_id(),
			is_wp_error( $result )
				? array( 'type' => 'error', 'message' => $result->get_error_message() )
				: array( 'type' => 'success', 'message' => $success ),
			MINUTE_IN_SECONDS
		);
		wp_safe_redirect( self::page_url() );
		exit;
	}

	private static function page_url(): string {
		return admin_url( 'admin.php?page=' . self::PAGE );
	}

	/**
	 * A small POST form that submits to one of the handlers above.
	 *
	 * @param string               $action Handler name.
	 * @param string               $label  Button label.
	 * @param string               $class  Button classes.
	 * @param array<string,string> $fields Hidden fields.
	 * @param string               $confirm Optional confirmation question.
	 */
	private static function action_button( string $action, string $label, string $class = 'button', array $fields = array(), string $confirm = '' ): void {
		?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="clothsy-ai-inline-form"
			<?php if ( $confirm ) : ?>
				onsubmit="return confirm(<?php echo esc_attr( wp_json_encode( $confirm ) ); ?>);"
			<?php endif; ?>
		>
			<input type="hidden" name="action" value="<?php echo esc_attr( 'clothsy_ai_' . $action ); ?>" />
			<?php wp_nonce_field( 'clothsy_ai_' . $action ); ?>
			<?php foreach ( $fields as $name => $value ) : ?>
				<input type="hidden" name="<?php echo esc_attr( $name ); ?>" value="<?php echo esc_attr( $value ); ?>" />
			<?php endforeach; ?>
			<button type="submit" class="<?php echo esc_attr( $class ); ?>"><?php echo esc_html( $label ); ?></button>
		</form>
		<?php
	}

	// ─── Page ───────────────────────────────────────────────────────────────

	public static function render(): void {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			return;
		}

		$notice = get_transient( 'clothsy_ai_notice_' . get_current_user_id() );
		delete_transient( 'clothsy_ai_notice_' . get_current_user_id() );

		$connection = Clothsy_AI_Settings::connection();
		$status     = $connection && 'connected' === $connection['status'] ? Clothsy_AI_Connection::status() : null;
		$remote     = is_array( $status ) ? $status : null;
		$moved      = $connection && 'connected' === $connection['status']
			&& ( untrailingslashit( $connection['site_url'] ) !== untrailingslashit( home_url() )
				|| ( $remote && 'url_mismatch' === ( $remote['connectionStatus'] ?? '' ) ) );
		?>
		<div class="wrap clothsy-ai-admin">
			<h1 class="clothsy-ai-title">
				<img src="<?php echo esc_url( CLOTHSY_AI_URL . 'assets/logo.png' ); ?>" alt="" width="32" height="32" />
				<?php esc_html_e( 'Clothsy AI', 'clothsy-ai' ); ?>
			</h1>
			<p class="clothsy-ai-subtitle"><?php esc_html_e( 'Virtual try-on for your product pages.', 'clothsy-ai' ); ?></p>

			<?php if ( is_array( $notice ) ) : ?>
				<div class="notice notice-<?php echo esc_attr( $notice['type'] ); ?> is-dismissible"><p><?php echo esc_html( $notice['message'] ); ?></p></div>
			<?php endif; ?>

			<?php self::render_connection( $connection, $moved, $status ); ?>

			<?php if ( $remote && ! $moved ) : ?>
				<?php self::render_usage( $remote ); ?>
			<?php endif; ?>

			<?php self::render_settings(); ?>
		</div>
		<?php
	}

	/**
	 * @param array<string,string>|null  $connection Stored connection.
	 * @param bool                       $moved      Connected, but for a different URL.
	 * @param array<string,mixed>|WP_Error|null $status Remote status.
	 */
	private static function render_connection( ?array $connection, bool $moved, $status ): void {
		?>
		<div class="clothsy-ai-card">
			<h2><?php esc_html_e( 'Connection', 'clothsy-ai' ); ?></h2>

			<?php if ( ! $connection ) : ?>
				<?php if ( Clothsy_AI_Settings::connection_unreadable() ) : ?>
					<p class="clothsy-ai-warning"><?php esc_html_e( "This site's security keys have changed since Clothsy AI was connected, so the saved connection can no longer be read. Please connect again.", 'clothsy-ai' ); ?></p>
				<?php endif; ?>
				<p><?php esc_html_e( 'Connect your store to Clothsy AI to show the try-on button on your product pages. It takes a few seconds, and the free Basic plan is applied automatically.', 'clothsy-ai' ); ?></p>
				<p class="description"><?php esc_html_e( "Clothsy AI will briefly call this site back to confirm you own it, so it must be publicly reachable (not in maintenance mode or behind a password).", 'clothsy-ai' ); ?></p>
				<?php self::action_button( 'connect', __( 'Connect store', 'clothsy-ai' ), 'button button-primary' ); ?>

			<?php elseif ( 'connected' !== $connection['status'] ) : ?>
				<p class="clothsy-ai-warning"><?php esc_html_e( "Your store is registered, but Clothsy AI couldn't confirm this site yet. Make sure the site is publicly reachable, then try again.", 'clothsy-ai' ); ?></p>
				<?php self::action_button( 'reverify', __( 'Try again', 'clothsy-ai' ), 'button button-primary' ); ?>
				<?php self::action_button( 'disconnect', __( 'Start over', 'clothsy-ai' ) ); ?>

			<?php elseif ( $moved ) : ?>
				<p class="clothsy-ai-warning">
					<?php
					printf(
						/* translators: 1: URL the store was connected at, 2: this site's URL. */
						esc_html__( 'Clothsy AI is connected to %1$s, but this site is %2$s. Try-on is switched off here.', 'clothsy-ai' ),
						'<code>' . esc_html( $connection['site_url'] ) . '</code>',
						'<code>' . esc_html( home_url() ) . '</code>'
					);
					?>
				</p>
				<p><?php esc_html_e( 'If you moved your store to this address, move the connection here. If this is a staging or test copy, leave it as it is.', 'clothsy-ai' ); ?></p>
				<?php self::action_button( 'reverify', __( 'Move connection to this site', 'clothsy-ai' ), 'button button-primary' ); ?>

			<?php else : ?>
				<p>
					<span class="clothsy-ai-badge clothsy-ai-badge-success"><?php esc_html_e( 'Connected', 'clothsy-ai' ); ?></span>
					<span class="description"><?php echo esc_html( sprintf( /* translators: %s: store id */ __( 'Store ID: %s', 'clothsy-ai' ), $connection['store_id'] ) ); ?></span>
				</p>
				<?php if ( is_wp_error( $status ) ) : ?>
					<p class="clothsy-ai-warning"><?php echo esc_html( $status->get_error_message() ); ?></p>
				<?php endif; ?>
				<?php self::action_button( 'disconnect', __( 'Disconnect', 'clothsy-ai' ), 'button button-link-delete', array(), __( 'Disconnect Clothsy AI? The try-on button will disappear from your store.', 'clothsy-ai' ) ); ?>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * @param array<string,mixed> $status Remote status.
	 */
	private static function render_usage( array $status ): void {
		$monthly   = (int) ( $status['monthlyCredits'] ?? 0 );
		$used      = (int) ( $status['creditsUsed'] ?? 0 );
		$remaining = max( 0, $monthly - $used );
		$stats     = is_array( $status['last30Days'] ?? null ) ? $status['last30Days'] : array();
		$enabled   = ! empty( $status['isEnabled'] );
		?>
		<div class="clothsy-ai-card">
			<h2><?php esc_html_e( 'Virtual try-on', 'clothsy-ai' ); ?></h2>
			<div class="clothsy-ai-row">
				<p>
					<span class="clothsy-ai-badge <?php echo $enabled ? 'clothsy-ai-badge-success' : ''; ?>"><?php echo $enabled ? esc_html__( 'On', 'clothsy-ai' ) : esc_html__( 'Off', 'clothsy-ai' ); ?></span>
					<?php esc_html_e( "When off, shoppers can't start a try-on even if the button is still shown.", 'clothsy-ai' ); ?>
				</p>
				<?php
				self::action_button(
					'toggle',
					$enabled ? __( 'Turn off', 'clothsy-ai' ) : __( 'Turn on', 'clothsy-ai' ),
					$enabled ? 'button' : 'button button-primary',
					array( 'enable' => $enabled ? '0' : '1' )
				);
				?>
			</div>
			<?php if ( ! empty( $status['isSuspended'] ) ) : ?>
				<p class="clothsy-ai-warning"><?php esc_html_e( 'Try-on is suspended for this store. Please contact Clothsy AI support.', 'clothsy-ai' ); ?></p>
			<?php endif; ?>
		</div>

		<div class="clothsy-ai-card">
			<h2><?php esc_html_e( 'Usage', 'clothsy-ai' ); ?></h2>
			<p>
				<strong><?php echo esc_html( number_format_i18n( $remaining ) ); ?></strong>
				<?php
				printf(
					/* translators: 1: try-ons used, 2: monthly allowance, 3: plan name. */
					esc_html__( 'try-ons left this month (%1$s of %2$s used on the %3$s plan).', 'clothsy-ai' ),
					esc_html( number_format_i18n( $used ) ),
					esc_html( number_format_i18n( $monthly ) ),
					esc_html( (string) ( $status['plan']['label'] ?? '' ) )
				);
				?>
			</p>
			<div class="clothsy-ai-metrics">
				<?php
				$metrics = array(
					__( 'Try-on opens', 'clothsy-ai' )      => (int) ( $stats['opens'] ?? 0 ),
					__( 'Try-ons completed', 'clothsy-ai' ) => (int) ( $stats['tryOnsCompleted'] ?? 0 ),
					__( 'Emails captured', 'clothsy-ai' )   => (int) ( $stats['emailsCaptured'] ?? 0 ),
					__( 'Total leads', 'clothsy-ai' )       => (int) ( $status['totalLeads'] ?? 0 ),
				);
				foreach ( $metrics as $label => $value ) :
					?>
					<div class="clothsy-ai-metric">
						<span><?php echo esc_html( $label ); ?></span>
						<strong><?php echo esc_html( number_format_i18n( $value ) ); ?></strong>
					</div>
				<?php endforeach; ?>
			</div>
			<p class="description"><?php esc_html_e( 'Opens, try-ons and emails cover the last 30 days.', 'clothsy-ai' ); ?></p>
			<?php self::action_button( 'leads_csv', __( 'Download leads (CSV)', 'clothsy-ai' ) ); ?>
		</div>
		<?php
	}

	private static function render_settings(): void {
		$s = Clothsy_AI_Settings::get();
		?>
		<div class="clothsy-ai-card">
			<h2><?php esc_html_e( 'Button', 'clothsy-ai' ); ?></h2>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="clothsy_ai_save_settings" />
				<?php wp_nonce_field( 'clothsy_ai_save_settings' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="clothsy-ai-text"><?php esc_html_e( 'Button text', 'clothsy-ai' ); ?></label></th>
						<td><input type="text" id="clothsy-ai-text" name="clothsy_ai[button_text]" value="<?php echo esc_attr( $s['button_text'] ); ?>" class="regular-text" maxlength="40" /></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Colors', 'clothsy-ai' ); ?></th>
						<td>
							<label><?php esc_html_e( 'Background', 'clothsy-ai' ); ?><br />
								<input type="text" name="clothsy_ai[button_color]" value="<?php echo esc_attr( $s['button_color'] ); ?>" class="clothsy-ai-color" /></label>
							<br />
							<label><?php esc_html_e( 'Text', 'clothsy-ai' ); ?><br />
								<input type="text" name="clothsy_ai[text_color]" value="<?php echo esc_attr( $s['text_color'] ); ?>" class="clothsy-ai-color" /></label>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="clothsy-ai-radius"><?php esc_html_e( 'Corner radius', 'clothsy-ai' ); ?></label></th>
						<td><input type="number" id="clothsy-ai-radius" name="clothsy_ai[radius]" value="<?php echo esc_attr( (string) $s['radius'] ); ?>" min="0" max="50" class="small-text" /> px
							<p class="description"><?php esc_html_e( '0 for square corners, 24 or more for a pill shape.', 'clothsy-ai' ); ?></p></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Email', 'clothsy-ai' ); ?></th>
						<td><label><input type="checkbox" name="clothsy_ai[require_email]" value="1" <?php checked( $s['require_email'] ); ?> />
							<?php esc_html_e( 'Ask shoppers for their email before the try-on', 'clothsy-ai' ); ?></label>
							<p class="description"><?php esc_html_e( 'Captured emails appear in Usage and can be downloaded as a CSV.', 'clothsy-ai' ); ?></p></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Placement', 'clothsy-ai' ); ?></th>
						<td>
							<fieldset>
								<label><input type="radio" name="clothsy_ai[placement]" value="auto" <?php checked( $s['placement'], 'auto' ); ?> />
									<?php esc_html_e( 'Automatically, below the Add to cart button', 'clothsy-ai' ); ?></label><br />
								<label><input type="radio" name="clothsy_ai[placement]" value="manual" <?php checked( $s['placement'], 'manual' ); ?> />
									<?php esc_html_e( "Manually, where I add the block or shortcode", 'clothsy-ai' ); ?></label>
							</fieldset>
							<p class="description">
								<?php
								printf(
									/* translators: 1: block name, 2: shortcode. */
									esc_html__( 'Block themes and page builders: add the %1$s block to your product template, or use the %2$s shortcode.', 'clothsy-ai' ),
									'<strong>' . esc_html__( 'Clothsy AI Try-On Button', 'clothsy-ai' ) . '</strong>',
									'<code>[clothsy_ai_tryon]</code>'
								);
								?>
							</p>
						</td>
					</tr>
				</table>
				<?php submit_button( __( 'Save button settings', 'clothsy-ai' ) ); ?>
			</form>
		</div>
		<?php
	}
}
