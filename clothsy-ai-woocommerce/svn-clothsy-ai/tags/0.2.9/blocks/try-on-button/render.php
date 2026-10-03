<?php
/**
 * Server render of the Clothsy AI Try-On Button block.
 *
 * @package ClothsyAI
 *
 * @var WP_Block $block Block instance.
 */

defined( 'ABSPATH' ) || exit;

$clothsy_ai_product_id = isset( $block->context['postId'] ) && 'product' === ( $block->context['postType'] ?? '' )
	? (int) $block->context['postId']
	: 0;

echo Clothsy_AI_Frontend::render_button( $clothsy_ai_product_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in render_button().
