/*
 * Editor side of the Clothsy AI Try-On Button block. The button itself is
 * rendered on the server (render.php), because it needs the product and the
 * store's settings; in the editor a placeholder shows where it will appear.
 * Written without JSX so the plugin needs no build step.
 */
( function ( blocks, element, blockEditor, i18n ) {
	var el = element.createElement;
	var __ = i18n.__;

	blocks.registerBlockType( 'clothsy-ai/try-on-button', {
		edit: function () {
			return el(
				'div',
				blockEditor.useBlockProps( {
					style: {
						padding: '12px 24px',
						border: '1px dashed #6226fc',
						borderRadius: '6px',
						textAlign: 'center',
						color: '#6226fc',
						maxWidth: '400px'
					}
				} ),
				__( 'Clothsy AI try-on button — shows on product pages when your store is connected.', 'clothsy-ai' )
			);
		},
		save: function () {
			return null;
		}
	} );
} )( window.wp.blocks, window.wp.element, window.wp.blockEditor, window.wp.i18n );
