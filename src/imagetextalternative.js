/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module image/imagetextalternative
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import ImageTextAlternativeEngine from './imagetextalternative/imagetextalternativeengine';
import escPressHandler from '@ckeditor/ckeditor5-ui/src/bindings/escpresshandler';
import clickOutsideHandler from '@ckeditor/ckeditor5-ui/src/bindings/clickoutsidehandler';
import TextAlternativeFormView from './imagetextalternative/ui/textalternativeformview';
import ContextualBalloon from '@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon';

import textAlternativeIcon from '@ckeditor/ckeditor5-core/theme/icons/low-vision.svg';
import '../theme/imagetextalternative/theme.scss';

/**
 * The image text alternative plugin.
 *
 * @extends module:core/plugin~Plugin
 */
export default class ImageTextAlternative extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ ImageTextAlternativeEngine, ContextualBalloon ];
	}

	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'image/imagetextalternative';
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;

		this._createButton();

		/**
		 * Balloon panel containing text alternative form.
		 *
		 * @member {module:ui/panel/balloon/contextualballoon~ContextualBalloon}
		 */
		this.balloon = editor.plugins.get( ContextualBalloon );

		/**
		 * Form containing textarea and buttons, used to change the `alt` attribute of the image.
		 *
		 * @member {module:image/imagetextalternative/ui/textalternativeformview~TextAlternativeFormView}
		 */
		this.form = this._createForm();

		// Close on `ESC` press.
		escPressHandler( {
			emitter: this.form,
			activator: () => this.balloon.hasView( this.form ),
			callback: () => this._hideBalloon()
		} );

		clickOutsideHandler( {
			emitter: this.form,
			activator: () => this.balloon.hasView( this.form ),
			contextElement: this.balloon.view.element,
			callback: () => this._hideBalloon()
		} );
	}

	/**
	 * Creates the {@link module:image/imagetextalternative/ui/textalternativeformview~TextAlternativeFormView} instance.
	 *
	 * @private
	 * @returns {module:image/imagetextalternative/ui/textalternativeformview~TextAlternativeFormView} The form instance.
	 */
	_createForm() {
		const editor = this.editor;
		const form = new TextAlternativeFormView( editor.locale );

		this.listenTo( form, 'submit', () => {
			editor.execute( 'imageTextAlternative', {
				newValue: form.labeledInput.inputView.element.value
			} );

			this._hideBalloon();
		} );

		this.listenTo( form, 'cancel', () => this._hideBalloon() );

		return form;
	}

	/**
	 * Creates button showing text alternative change balloon panel and registers it in
	 * editor's {@link module:ui/componentfactory~ComponentFactory ComponentFactory}.
	 *
	 * @private
	 */
	_createButton() {
		const editor = this.editor;
		const command = editor.commands.get( 'imageTextAlternative' );
		const t = editor.t;

		editor.ui.componentFactory.add( 'imageTextAlternative', ( locale ) => {
			const view = new ButtonView( locale );

			view.set( {
				label: t( 'Change image text alternative' ),
				icon: textAlternativeIcon,
				tooltip: true
			} );

			view.bind( 'isEnabled' ).to( command, 'isEnabled' );

			this.listenTo( view, 'execute', () => this._showBalloon() );

			return view;
		} );
	}

	/**
	 * Shows the {@link #balloon} containing the {@link #form}.
	 *
	 * @protected
	 * @returns {Promise} A promise returned by
	 * {@link module:ui/panel/balloon/contextualballoon~ContextualBalloon#add}
	 */
	_showBalloon() {
		const editor = this.editor;
		const command = editor.commands.get( 'imageTextAlternative' );
		const viewDocument = this.editor.editing.view;

		this.form.labeledInput.value = command.value || '';

		return this.balloon.add( {
			view: this.form,
			position: {
				limiter: viewDocument.domConverter.getCorrespondingDomElement( viewDocument.selection.editableElement )
			}
		} ).then( () => {
			this.form.labeledInput.select();
		} );
	}

	/**
	 * Hides the {@link #balloon} containing the {@link #form}.
	 *
	 * @returns {Promise} A promise returned by
	 * {@link module:ui/panel/balloon/contextualballoon~ContextualBalloon#remove}
	 */
	_hideBalloon() {
		this.editor.editing.view.focus();

		return this.balloon.remove( this.form );
	}
}
