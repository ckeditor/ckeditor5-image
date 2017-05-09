/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module image/imagetoolbar
 */

import debounce from '@ckeditor/ckeditor5-utils/src/lib/lodash/debounce';
import Template from '@ckeditor/ckeditor5-ui/src/template';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ToolbarView from '@ckeditor/ckeditor5-ui/src/toolbar/toolbarview';
import { isImageWidget } from './image/utils';
import BalloonPanelView from '@ckeditor/ckeditor5-ui/src/panel/balloon/balloonpanelview';
import ContextualBalloon from '@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon';

/**
 * Image toolbar class. Creates an image toolbar placed inside
 * the {@link module:ui/panel/balloon/contextualballoon~ContextualBalloon} shown when image widget is selected.
 *
 * Toolbar components are created using editor's {@link module:ui/componentfactory~ComponentFactory ComponentFactory}
 * based on {@link module:core/editor/editor~Editor#config configuration} stored under `image.toolbar`.
 *
 * @extends module:core/plugin~Plugin
 */
export default class ImageToolbar extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ ContextualBalloon ];
	}

	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'image/imagetoolbar';
	}

	/**
	 * @inheritDoc
	 */
	constructor( editor ) {
		super( editor );
	}

	/**
	 * @inheritDoc
	 */
	afterInit() {
		const editor = this.editor;
		const toolbarConfig = editor.config.get( 'image.toolbar' );

		// Don't add the toolbar if there is no configuration.
		if ( !toolbarConfig || !toolbarConfig.length ) {
			return;
		}

		/**
		 * A contextual balloon containing the {@link #toolbar}.
		 *
		 * @member {module:ui/panel/balloon/contextualballoon~ContextualBalloon}
		 */
		this.balloon = editor.plugins.get( ContextualBalloon );

		/**
		 * A tolbar view with the image–specific buttons.
		 *
		 * @member {module:ui/toolbar/toolbarview~ToolbarView}
		 */
		this.toolbar = new ToolbarView();

		// Add CSS class to the toolbar.
		Template.extend( this.toolbar.template, {
			attributes: {
				class: 'ck-editor-toolbar'
			}
		} );

		/**
		 * A debounced version of {@link #_checkVisible} to filter out the noise and reduce
		 * the number of method calls.
		 *
		 * @protected
		 * @member {Function}
		 */
		this._debouncedCheckVisible = debounce( () => {
			this._checkVisible();
		}, 50 );

		/**
		 * Retains a reference to the once selected image to determine whether the selection
		 * has switched to another image later on. It helps position the {@link #balloon}
		 * to the right image in the content.
		 *
		 * @private
		 * @member {module:engine/view/element~Element|null}
		 */
		this._previousSelectedImage = null;

		this.listenTo( editor.editing.view, 'render', () => {
			this._debouncedCheckVisible();
		}, { priority: 'low' } );

		this.listenTo( editor.ui.focusTracker, 'change:isFocused', ( evt, name, is, was ) => {
			if ( !was && is ) {
				this._debouncedCheckVisible();
			}
		} );

		// Add buttons to the toolbar.
		return this.toolbar.fillFromConfig( toolbarConfig, editor.ui.componentFactory );
	}

	/**
	 * Shows the toolbar by adding it to the {@link #balloon}.
	 *
	 * @returns {Promise} A promise returned by
	 * {@link module:ui/panel/balloon/contextualballoon~ContextualBalloon#add}
	 */
	show() {
		if ( !this.balloon.hasView( this.toolbar ) ) {
			return this.balloon.add( {
				view: this.toolbar,
				position: this._getPositionData(),
				balloonClassName: 'ck-toolbar-container'
			} );
		} else {
			this.balloon.updatePosition( this._getPositionData() );
		}

		return Promise.resolve();
	}

	/**
	 * Hides the {@link #toolbar} by removing it from the {@link #balloon}.
	 *
	 * @returns {Promise} A promise returned by
	 * {@link module:ui/panel/balloon/contextualballoon~ContextualBalloon#remove}
	 */
	hide() {
		this._previousSelectedImage = null;

		if ( !this.balloon.hasView( this.toolbar ) ) {
			return Promise.resolve();
		}

		return this.balloon.remove( this.toolbar );
	}

	/**
	 * Upon a call, depending on editor focus state and selection,
	 * it decides whether to {@link #show} or {@link #hide} the {@link #balloon}
	 * containing the {@link #toolbar}.
	 *
	 * @protected
	 * @returns {Promise} A promise returned by either {@link #show} or {@link #hide}.
	 */
	_checkVisible() {
		if ( !this.editor.ui.focusTracker.isFocused ) {
			return this.hide();
		}

		const selectedImage = this._getSelectedImage();

		if ( selectedImage ) {
			const isNewImageSelected = ( this._previousSelectedImage && this._previousSelectedImage != selectedImage );

			this._previousSelectedImage = selectedImage;

			if ( isNewImageSelected ) {
				return this.hide()
					.then( () => this.show() );
			} else {
				return this.show();
			}
		} else {
			return this.hide();
		}
	}

	/**
	 * Returns positioning options for the {@link #panel}. They control the way balloon is attached
	 * to the target element or selection.
	 *
	 * @private
	 * @returns {module:utils/dom/position~Options}
	 */
	_getPositionData() {
		const defaultPositions = BalloonPanelView.defaultPositions;
		const editingView = this.editor.editing.view;
		const selectedImage = this._getSelectedImage();

		return {
			target: editingView.domConverter.getCorrespondingDomElement( selectedImage ),
			limiter: editingView.domConverter.getCorrespondingDomElement( editingView.selection.editableElement ),
			positions: [ defaultPositions.northArrowSouth, defaultPositions.southArrowNorth ]
		};
	}

	/**
	 * Returns the image selected in the editor's editing view or `null` when there's none.
	 *
	 * @private
	 * @returns {module:engine/view/element~Element|null}
	 */
	_getSelectedImage() {
		const selectedElement = this.editor.editing.view.selection.getSelectedElement();

		if ( selectedElement && isImageWidget( selectedElement ) ) {
			return selectedElement;
		} else {
			return null;
		}
	}
}
