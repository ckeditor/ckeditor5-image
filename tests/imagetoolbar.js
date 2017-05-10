/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classic';
import ImageToolbar from '../src/imagetoolbar';
import Image from '../src/image';
import global from '@ckeditor/ckeditor5-utils/src/dom/global';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import ContextualBalloon from '@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon';
import BalloonPanelView from '@ckeditor/ckeditor5-ui/src/panel/balloon/balloonpanelview';
import ToolbarView from '@ckeditor/ckeditor5-ui/src/toolbar/toolbarview';
import { setData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

describe( 'ImageToolbar', () => {
	let editor, button, editingView, doc, balloon, toolbar, plugin;

	beforeEach( () => {
		const editorElement = global.document.createElement( 'div' );
		global.document.body.appendChild( editorElement );

		return ClassicEditor.create( editorElement, {
			plugins: [ Image, ImageToolbar, FakeButton ],
			image: {
				toolbar: [ 'fake_button', 'fake_button' ]
			}
		} )
		.then( newEditor => {
			editor = newEditor;
			editingView = editor.editing.view;
			doc = editor.document;
			plugin = editor.plugins.get( ImageToolbar );
			balloon = plugin.balloon;
			toolbar = plugin.toolbar;

			sinon.stub( balloon, 'add' ).returns( Promise.resolve() );
			sinon.stub( balloon, 'remove' ).returns( Promise.resolve() );
			sinon.stub( balloon, 'updatePosition' );

			doc.schema.allow( { name: '$text', inside: '$root' } );
		} );
	} );

	afterEach( () => {
		return editor.destroy();
	} );

	it( 'should be loaded', () => {
		expect( editor.plugins.get( ImageToolbar ) ).to.be.instanceOf( ImageToolbar );
	} );

	it( 'should load ContextualBalloon', () => {
		expect( editor.plugins.get( ContextualBalloon ) ).to.instanceOf( ContextualBalloon );
	} );

	it( 'should not initialize if there is no configuration', () => {
		const editorElement = global.document.createElement( 'div' );
		global.document.body.appendChild( editorElement );

		return ClassicEditor.create( editorElement, {
				plugins: [ ImageToolbar ],
			} )
			.then( newEditor => {
				expect( newEditor.plugins.get( ImageToolbar ).balloon ).to.be.undefined;

				newEditor.destroy();
			} );
	} );

	it( 'should set the #balloon property', () => {
		expect( plugin.balloon ).to.be.instanceOf( ContextualBalloon );
	} );

	describe( 'toolbar', () => {
		it( 'should be under #toolbar property', () => {
			expect( toolbar ).to.be.instanceOf( ToolbarView );
		} );

		it( 'should have a proper CSS class', () => {
			expect( toolbar.element.classList.contains( 'ck-editor-toolbar' ) ).to.be.true;
		} );

		it( 'should load items from config.image.toolbar', () => {
			expect( toolbar.items ).to.have.length( 2 );
		} );
	} );

	it( 'calls #_debouncedCheckVisible on #render', () => {
		const spy = sinon.spy( plugin, '_debouncedCheckVisible' );

		editor.editing.view.fire( 'render' );

		sinon.assert.calledOnce( spy );
	} );

	it( 'calls #_debouncedCheckVisible when editor becomes focused', () => {
		editor.ui.focusTracker.isFocused = false;

		const spy = sinon.spy( plugin, '_debouncedCheckVisible' );

		editor.ui.focusTracker.isFocused = true;
		sinon.assert.calledOnce( spy );

		editor.ui.focusTracker.isFocused = false;
		sinon.assert.calledOnce( spy );
	} );

	describe( 'show', () => {
		let editableElement;

		beforeEach( () => {
			editableElement = editingView.domConverter.getCorrespondingDomElement( editingView.selection.editableElement );
		} );

		it( 'adds #toolbar to the #balloon', () => {
			setData( doc, '[<image src=""></image>]' );

			const defaultPositions = BalloonPanelView.defaultPositions;

			return plugin.show()
				.then( () => {
					sinon.assert.calledWithExactly( balloon.add, {
						view: toolbar,
						position: {
							target: editingView.domConverter.getCorrespondingDomElement( editingView.selection.getSelectedElement() ),
							limiter: editableElement,
							positions: [ defaultPositions.northArrowSouth, defaultPositions.southArrowNorth ]
						},
						balloonClassName: 'ck-toolbar-container'
					} );
				} );
		} );

		it( 'calls balloon#updatePosition if #toolbar already in the #balloon', () => {
			setData( doc, '[<image src=""></image>]' );

			const defaultPositions = BalloonPanelView.defaultPositions;

			return plugin.show()
				.then( () => {
					sinon.stub( balloon, 'hasView' ).returns( true );

					return plugin.show()
						.then( () => {
							sinon.assert.calledWithExactly( balloon.updatePosition, {
								target: editingView.domConverter.getCorrespondingDomElement( editingView.selection.getSelectedElement() ),
								limiter: editableElement,
								positions: [ defaultPositions.northArrowSouth, defaultPositions.southArrowNorth ]
							} );
						} );
				} );
		} );
	} );

	describe( 'hide', () => {
		let editableElement;

		beforeEach( () => {
			editableElement = editingView.domConverter.getCorrespondingDomElement( editingView.selection.editableElement );
		} );

		it( 'removes #toolbar from the #balloon', () => {
			setData( doc, '[<image src=""></image>]' );

			return plugin.show()
				.then( () => {
					sinon.stub( balloon, 'hasView' ).returns( true );

					return plugin.hide()
						.then( () => {
							sinon.assert.calledWithExactly( balloon.remove, toolbar );
						} );
				} );
		} );

		it( 'does not remove #toolbar from the #balloon, if not previously added', () => {
			return plugin.hide()
				.then( () => {
					sinon.assert.notCalled( balloon.remove );
				} );
		} );
	} );

	describe( '_checkVisible', () => {
		it( 'should #hide the balloon when the editor is blurred', () => {
			setData( doc, '[<image src=""></image>]' );

			const spyShow = sinon.spy( plugin, 'show' );
			const spyHide = sinon.spy( plugin, 'hide' );

			editor.ui.focusTracker.isFocused = false;

			return plugin._checkVisible()
				.then( () => {
					sinon.assert.notCalled( spyShow );
					sinon.assert.calledOnce( spyHide );
				} );
		} );

		it( 'should #show the balloon when the image is selected', () => {
			setData( doc, '[<image src=""></image>]' );

			const spy = sinon.spy( plugin, 'show' );
			editor.ui.focusTracker.isFocused = true;

			return plugin._checkVisible()
				.then( () => {
					sinon.assert.calledOnce( spy );
				} );
		} );

		it( 'should #hide the balloon when the image is not selected', () => {
			setData( doc, '[foo]<image src=""></image>' );

			const spyShow = sinon.spy( plugin, 'show' );
			const spyHide = sinon.spy( plugin, 'hide' );

			editor.ui.focusTracker.isFocused = true;

			return plugin._checkVisible()
				.then( () => {
					sinon.assert.notCalled( spyShow );
					sinon.assert.calledOnce( spyHide );
				} );
		} );

		it( 'should #hide then #show the balloon when another image becomes selected', () => {
			setData( doc, '[<image src=""></image>]<image src=""></image>' );

			editor.ui.focusTracker.isFocused = true;

			return plugin._checkVisible()
				.then( () => {
					const spyShow = sinon.spy( plugin, 'show' );
					const spyHide = sinon.spy( plugin, 'hide' );

					setData( doc, '<image src=""></image>[<image src=""></image>]' );

					return plugin._checkVisible()
						.then( () => {
							sinon.assert.calledOnce( spyShow );
							sinon.assert.calledOnce( spyHide );
						} );
				} );
		} );
	} );

	// Plugin that adds fake_button to editor's component factory.
	class FakeButton extends Plugin {
		init() {
			this.editor.ui.componentFactory.add( 'fake_button', ( locale ) => {
				const view = new ButtonView( locale );

				view.set( {
					label: 'fake button'
				} );

				button = view;

				return view;
			} );
		}
	}
} );
